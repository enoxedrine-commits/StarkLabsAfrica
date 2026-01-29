import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, query, where, limit, orderBy, getCountFromServer } from "firebase/firestore";
import { productSearchableText, extractProductSearchPhrase, runIntelligentSearch, buildSearchTerms } from "@/lib/intelligentProductSearch";

const systemPrompt =
  "You are StarkLabs' customer service assistant. Be concise, friendly, and helpful. " +
  "Answer questions about products, quotes, orders, shipping, returns, and account issues. " +
  "When 'Products in database' is provided in the context, use that list to answer product and catalog questions. Do not say you do not have product data when it is provided—always use the list. " +
  "Product search (priority) is the first-priority product lookup (SearchBar-style: any term in name/description/sku/manufacturer/tags). Always use it when present. 'Intelligent search' or 'Keyword search' results are also pre-filtered and relevance-ranked; use them to answer. " +
  "When 'Total active products in database' is given, use that for counts (e.g. 'how many products do you have'). When 'FULL catalog' is provided, you can list or summarize from the full set; when it is a sample, you may say it is a selection and they can ask for 'all products' or 'full catalog' to see more. " +
  "Product data may include description, warranty, manufacturer, and attributes (name/description pairs). Use these when answering questions about a product's features, warranty, or specifications. " +
  "Use database lookup results when provided and never invent order or product details. " +
  "When 'Order lookup' or 'Recent orders' is in the context, use that data to answer; do not say you lack access to the order system. " +
  "When listing orders, always show the order number in UPPERCASE (e.g. Order #0NO20PBGDP1XUGM9AAU4). Use orderIdDisplay when present; otherwise use id in UPPERCASE. Do not use title case or mixed case. " +
  "If a user asks about an order but order number or email is missing, request the order number and the email used at checkout. " +
  "If you are unsure or need human help, ask a clarifying question and offer to connect them. " +
  "Do not ask for sensitive payment details. " +
  // Anti-hallucination: only claim what the system actually does.
  "IMPORTANT—do not invent processes or promise outcomes this chat cannot deliver: " +
  "This chat does NOT save conversations, log requests, or forward them to any team. " +
  "Do NOT say you have 'noted', 'logged', 'recorded', or 'submitted' the user's request, or that it is 'available to our sales team' or 'in our system'. " +
  "Do NOT promise that 'a team member will contact you' or 'we will be in touch' for requests made only in this chat. " +
  "For quote requests: you can only look up existing quote requests by email (from the Request Quote form). If the user wants to get a NEW quote, tell them to add items to their cart and use the 'Request Quote' button on the cart or checkout page—that is how quote requests are actually submitted and reach the sales team. Do not claim their in-chat message creates or submits a quote request. " +
  "In general: only describe actions and systems that exist. If you are not sure whether something happens in the background, do not claim it does.";

function extractEmail(text = "") {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function extractOrderId(text = "") {
  // "order id X", "order # X", "order ID: X"
  const orderMatch = text.match(/order\s*(id|#)?\s*([A-Za-z0-9]{6,})/i);
  if (orderMatch?.[2]) return orderMatch[2];
  // "#VUM9F7..." (hash before alphanumeric)
  const hashMatch = text.match(/#([A-Za-z0-9]{8,})/);
  if (hashMatch) return hashMatch[1];
  // "order ... code : X" or "order ... id/number : X" (order-id-shaped: 12+ alphanumeric, no hyphens)
  const orderCodeMatch = text.match(/\border\b[\s\S]*?(?:code|id|number|#)\s*[:\s]*([A-Za-z0-9]{12,})/i);
  if (orderCodeMatch?.[1]) return orderCodeMatch[1];
  return null;
}

function extractSku(text = "") {
  let match = text.match(/\bsku[:\s]*([A-Za-z0-9-]{3,})/i);
  if (match) return match[1].trim();
  // Fallback: standalone SKU-like token (e.g. H-QR8-38, ABC-X12-34)
  match = text.match(/\b([A-Za-z][A-Za-z0-9]*-[A-Za-z0-9]{2,6}-[0-9]{2,3})\b/);
  return match ? match[1].trim() : null;
}

function extractProductCode(text = "") {
  const match = text.match(/\b(?:product\s+)?code[:\s]*([A-Za-z0-9-]{3,})/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract search terms for brand/manufacturer/description search.
 * E.g. "by AlphaMed", "AlphaMed in description", "details of AlphaMed in description", "manufacturer X", "brand X".
 */
function extractSearchKeywords(text = "") {
  const keywords = new Set();
  const patterns = [
    /\b(?:by|manufacturer|brand)\s+([A-Za-z0-9][A-Za-z0-9\s\-]{1,50}?)(?=\s|,|\.|\?|$)/gi,
    /(?:details of|containing|that (?:has|mentions?|contains)|with)\s+([A-Za-z0-9][A-Za-z0-9\s\-]{1,50}?)\s*(?:in (?:the\s+)?(?:description|name)|$|,|\.|\?)/gi,
    /(?:in (?:the\s+)?(?:description|name))[:\s]+([A-Za-z0-9][A-Za-z0-9\s\-]{1,50}?)(?=\s|,|\.|\?|$)/gi,
    /\b(?:find|search for|product with|that (?:has|contains))\s+([A-Za-z0-9][A-Za-z0-9\s\-]{1,50}?)(?=\s|,|\.|\?|$)/gi,
  ];
  for (const re of patterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const k = m[1].trim();
      if (k.length >= 2 && !/^\d+$/.test(k)) keywords.add(k);
    }
  }
  return [...keywords].slice(0, 5);
}

/** Check if product matches any of the keywords (uses productSearchableText from intelligentProductSearch: name, description, sku, productCode, manufacturer, tags, attributes). */
function productMatchesKeywords(p, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const t = productSearchableText(p);
  return keywords.some((k) => k && t.includes(String(k).toLowerCase().trim()));
}

function wantsCatalogList(text = "") {
  return /available products|what products|show products|list products|catalog|inventory|what do you have|what do you sell|what's available|do you have|do we have|looking for|items you|offer|sell/i.test(text);
}

/** User wants the complete product list (all products, full catalog). */
function wantsAllProducts(text = "") {
  return /all products|every product|complete catalog|full catalog|entire catalog|list all|list everything|everything you have|everything you sell|whole catalog|full list|complete list|all items|entire (product|item) list|show all|all of (your|the) products/i.test(text);
}

/** User is asking for product count (how many products). */
function wantsProductCount(text = "") {
  return /how many products|how many items|number of products|total products|product count|how many do you (have|sell|offer)|how many (products|items) (do you have|are there)|total (number of )?products/i.test(text);
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return `UGX ${Number(value).toLocaleString()}`;
}

function summarizeOrder(order) {
  const createdAt = order.createdAt?.toDate
    ? order.createdAt.toDate()
    : order.createdAt
    ? new Date(order.createdAt)
    : null;
  const items = Array.isArray(order.items) ? order.items : [];
  const total =
    order.totalAmount ??
    items.reduce((sum, item) => {
      const price = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
      return sum + (price || 0) * (item.quantity || 1);
    }, 0);
  const summary = items
    .slice(0, 3)
    .map((item) => `${item.name} x ${item.quantity || 1}`)
    .join(", ");

  return {
    id: order.id,
    orderIdDisplay: (order.id || "").toUpperCase(),
    status: order.status || "unknown",
    createdAt: createdAt ? createdAt.toISOString() : null,
    total: formatCurrency(total),
    summary: summary || "No items",
    paymentStatus: order.paymentStatus || "unknown",
  };
}

function summarizeProduct(product) {
  const price = product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;
  const attrs = Array.isArray(product.attributes) && product.attributes.length
    ? product.attributes
        .filter((a) => (a && (a.name || a.description)))
        .map((a) => ({ name: String(a.name || ""), description: String(a.description || "") }))
    : [];
  return {
    id: product.id,
    name: product.name,
    description: product.description || "—",
    warranty: product.warranty || "—",
    manufacturer: product.manufacturer || "—",
    attributes: attrs,
    price: formatCurrency(price),
    category: product.categoryName || product.category || "N/A",
    sku: product.sku || "N/A",
    stock: typeof product.qty === "number" ? product.qty : "N/A",
    status: product.status || "unknown",
    discount: product.discount ? Number(product.discount) : 0,
  };
}

const DESC_MAX = 100;

function summarizeProductMinimal(product) {
  const price = product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;
  return {
    name: product.name,
    price: formatCurrency(price),
    category: product.categoryName || product.category || "N/A",
    sku: product.sku || "N/A",
  };
}

function summarizeProductShort(product) {
  const price = product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;
  const rawDesc = product.description || "";
  const description = rawDesc
    ? rawDesc.slice(0, DESC_MAX) + (rawDesc.length > DESC_MAX ? "…" : "")
    : "—";
  return {
    id: product.id,
    name: product.name,
    description,
    warranty: product.warranty || "—",
    manufacturer: product.manufacturer || "—",
    price: formatCurrency(price),
    category: product.categoryName || product.category || "N/A",
    sku: product.sku || "N/A",
  };
}

export async function POST(req) {
  try {
    const { message, messages } = await req.json();

    if (!message || typeof message !== "string") {
      return Response.json(
        { reply: "Please send a valid message." },
        { status: 400 }
      );
    }

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-3-flash-preview",
      temperature: 0.4,
    });

    const contextNotes = [];
    const wantsOrder = /order|shipping|delivery|track|status/i.test(message);
    const wantsQuote = /quote|quotation/i.test(message);
    const wantsProduct = /product|pdt|price|availability|stock|warranty|description|specification|spec|feature|attributes|manufacturer/i.test(message);
    const wantsCatalog = wantsCatalogList(message);
    let email = extractEmail(message);
    let orderId = extractOrderId(message);
    let sku = extractSku(message);
    let productCode = extractProductCode(message);

    // When user is asking about an ORDER, do not treat "code : XXXXX" as product code.
    // Order IDs are typically 12+ alphanumeric, no hyphens; product SKUs/codes often have hyphens (e.g. H-QR8-38).
    if (wantsOrder && productCode && /^[A-Za-z0-9]{12,}$/.test(productCode)) {
      productCode = null;
    }
    if (wantsOrder && sku && /^[A-Za-z0-9]{12,}$/.test(sku) && !/-/.test(sku)) {
      sku = null;
    }

    // Resolve email from recent user messages when we have orderId but not email in this message
    if (wantsOrder && orderId && !email && Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m && (m.role === "user" || m.role === "human") && typeof m.content === "string") {
          const e = extractEmail(m.content);
          if (e) {
            email = e;
            break;
          }
        }
      }
    }

    let productLookupPerformed = false;
    let productFound = false;
    let orderLookupFailed = false;
    let orderEmailMismatch = false;
    let quoteLookupFailed = false;

    // Use the same Firestore client as the rest of the app (lib/firebase) — no service account / private key
    // --- RAG: Fetch products. Use 1000 when "all", keyword search, or intelligent (phrase) search. ---
    const needAllProducts = wantsAllProducts(message);
    const needProductCount = wantsProductCount(message);
    const searchKeywords = extractSearchKeywords(message);
    const searchPhrase = extractProductSearchPhrase(message);
    const searchTerms = buildSearchTerms(searchPhrase.phrase, searchPhrase.words, searchKeywords);
    const needIntelligentSearch = searchPhrase.phrase || (searchPhrase.words && searchPhrase.words.length > 0);
    const productLimit = needAllProducts || searchKeywords.length > 0 || needIntelligentSearch || searchTerms.length > 0 || wantsCatalog ? 1000 : 50;

    let totalCount = null;
    if (needAllProducts || needProductCount) {
      try {
        const countSnap = await getCountFromServer(
          query(collection(db, "products"), where("status", "==", "active"))
        );
        totalCount = countSnap.data().count;
      } catch (_) {}
    }

    let productSnap = await getDocs(
      query(collection(db, "products"), where("status", "==", "active"), limit(productLimit))
    );
    if (productSnap.empty) {
      productSnap = await getDocs(query(collection(db, "products"), limit(productLimit)));
    }
    let productList = productSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // --- 1st PRIORITY: Search (SearchBar-style). Any of [phrase, words, keywords, normalized keywords] in name/description/sku/productCode/manufacturer/tags/attributes. Fixes "AlphaMeds" not matching "AlphaMed" in description. ---
    if (searchTerms.length > 0) {
      productList = productList.filter((p) =>
        searchTerms.some((t) => productSearchableText(p).includes(t))
      );
    }

    // Intelligent search: relevance scoring (phrase, words, keywords) — used with search-first to rank
    if (needIntelligentSearch && productList.length > 0) {
      productList = runIntelligentSearch(productList, {
        phrase: searchPhrase.phrase,
        words: searchPhrase.words || [],
        keywords: searchKeywords,
      }, 50, 20);
    }

    let productSummaries = [];
    if (searchTerms.length > 0) {
      const label = searchTerms.slice(0, 8).join(", ");
      const ranked = needIntelligentSearch ? " (relevance-ranked)" : "";
      if (productList.length === 0) {
        contextNotes.push(`Product search (priority) for [${label}]: no products found in the active catalog.`);
      } else {
        contextNotes.push(
          `Product search (priority) for [${label}]: ${productList.length} product(s)${ranked}: ${JSON.stringify(productList.map(summarizeProduct))}`
        );
      }
      productSummaries = productList.map(summarizeProduct);
    } else {
      // Skip product context when the user is only asking about orders/quotes (not products)
      const isOrderOrQuoteOnly = (wantsOrder || wantsQuote) && !wantsProduct && !wantsCatalog && searchTerms.length === 0 && !sku && !productCode;
      if (!isOrderOrQuoteOnly) {
        const summarizer = needAllProducts ? summarizeProductMinimal : summarizeProductShort;
        productSummaries = productList.map(summarizer);
        const countLine = totalCount != null ? `Total active products in database: ${totalCount}. ` : "";
        const scope = needAllProducts ? "FULL catalog (use for listing and counts)" : "use for product/catalog questions, do not guess";
        if (productSummaries.length > 0) {
          contextNotes.push(`${countLine}Products in database (${scope}): ${JSON.stringify(productSummaries)}`);
        } else {
          contextNotes.push(`${countLine}Products in database: none.`);
        }
      } else {
        productSummaries = [];
      }
    }
    if (wantsCatalog && productSummaries.length === 0 && searchTerms.length === 0) {
      return Response.json({
        reply:
          "I couldn't find any active products right now. Please try again later.",
      });
    }

    if (wantsOrder) {
      if (orderId && email) {
        const orderSnap = await getDoc(doc(db, "orders", orderId));
        if (orderSnap.exists()) {
          const order = { id: orderSnap.id, ...orderSnap.data() };
          const matchesEmail =
            order.userEmail === email || order.address?.email === email;
          if (matchesEmail) {
            contextNotes.push(
              `Order lookup: ${JSON.stringify(summarizeOrder(order))}`
            );
          } else {
            orderEmailMismatch = true;
          }
        } else {
          orderLookupFailed = true;
        }
      } else if (email) {
        const orders = [];
        try {
          const direct = await getDocs(
            query(
              collection(db, "orders"),
              where("userEmail", "==", email),
              orderBy("createdAt", "desc"),
              limit(25)
            )
          );
          direct.docs.forEach((d) => orders.push({ id: d.id, ...d.data() }));

          const byAddress = await getDocs(
            query(
              collection(db, "orders"),
              where("address.email", "==", email),
              orderBy("createdAt", "desc"),
              limit(25)
            )
          );
          byAddress.docs.forEach((d) => {
            if (!orders.find((existing) => existing.id === d.id)) {
              orders.push({ id: d.id, ...d.data() });
            }
          });

          // Sort merged by createdAt desc, newest first
          orders.sort((a, b) => {
            const ta = a.createdAt?.toDate?.() ?? (a.createdAt ? new Date(a.createdAt) : 0);
            const tb = b.createdAt?.toDate?.() ?? (b.createdAt ? new Date(b.createdAt) : 0);
            return (tb?.getTime?.() ?? 0) - (ta?.getTime?.() ?? 0);
          });

          if (orders.length > 0) {
            const summaries = orders.slice(0, 25).map(summarizeOrder);
            contextNotes.push(`Recent orders (${summaries.length}): ${JSON.stringify(summaries)}. Note: this is the most recent set for this email; the customer may have more orders.`);
          } else {
            orderLookupFailed = true;
          }
        } catch (orderQueryErr) {
          // If orderBy fails (e.g. missing composite index), retry without orderBy
          if (orderQueryErr?.message?.includes("index") || orderQueryErr?.code === "failed-precondition") {
            orders.length = 0;
            const direct = await getDocs(
              query(collection(db, "orders"), where("userEmail", "==", email), limit(25))
            );
            direct.docs.forEach((d) => orders.push({ id: d.id, ...d.data() }));
            const byAddress = await getDocs(
              query(collection(db, "orders"), where("address.email", "==", email), limit(25))
            );
            byAddress.docs.forEach((d) => {
              if (!orders.find((existing) => existing.id === d.id)) {
                orders.push({ id: d.id, ...d.data() });
              }
            });
            orders.sort((a, b) => {
              const ta = a.createdAt?.toDate?.() ?? (a.createdAt ? new Date(a.createdAt) : 0);
              const tb = b.createdAt?.toDate?.() ?? (b.createdAt ? new Date(b.createdAt) : 0);
              return (tb?.getTime?.() ?? 0) - (ta?.getTime?.() ?? 0);
            });
            if (orders.length > 0) {
              const summaries = orders.slice(0, 25).map(summarizeOrder);
              contextNotes.push(`Recent orders (${summaries.length}): ${JSON.stringify(summaries)}. Note: this is a selection for this email; the customer may have more orders.`);
            } else {
              orderLookupFailed = true;
            }
          } else {
            throw orderQueryErr;
          }
        }
      }
    }

    if (wantsQuote && email) {
      const quoteRequests = await getDocs(
        query(collection(db, "quoteRequests"), where("userEmail", "==", email), limit(3))
      );
      const quoteSummaries = quoteRequests.docs.map((d) => ({
        id: d.id,
        status: d.data().status || "pending",
        createdAt: d.data().createdAt || null,
        total: formatCurrency(d.data().totalAmount),
      }));
      if (quoteSummaries.length > 0) {
        contextNotes.push(`Quote requests: ${JSON.stringify(quoteSummaries)}`);
      } else {
        quoteLookupFailed = true;
      }
    }

    // Direct SKU/productCode lookup: always run when user provides one (no need for wantsProduct).
    // Tries: (1) sku exact, (2) sku with hyphens removed, (3) productCode exact, (4) sku in productCode field.
    if (sku || productCode) {
      productLookupPerformed = true;
      let productDoc = null;

      if (sku) {
        let snap = await getDocs(query(collection(db, "products"), where("sku", "==", sku), limit(1)));
        if (!snap.empty) {
          productDoc = snap.docs[0];
        }
        if (!productDoc && /-/.test(sku)) {
          const noHyphens = sku.replace(/-/g, "");
          snap = await getDocs(query(collection(db, "products"), where("sku", "==", noHyphens), limit(1)));
          if (!snap.empty) productDoc = snap.docs[0];
        }
        if (!productDoc) {
          snap = await getDocs(query(collection(db, "products"), where("productCode", "==", sku), limit(1)));
          if (!snap.empty) productDoc = snap.docs[0];
        }
      }
      if (!productDoc && productCode) {
        const snap = await getDocs(
          query(collection(db, "products"), where("productCode", "==", productCode), limit(1))
        );
        if (!snap.empty) productDoc = snap.docs[0];
      }
      if (!productDoc && productCode) {
        const snap = await getDocs(
          query(collection(db, "products"), where("sku", "==", productCode), limit(1))
        );
        if (!snap.empty) productDoc = snap.docs[0];
      }

      if (productDoc) {
        const product = { id: productDoc.id, ...productDoc.data() };
        contextNotes.push(`Product lookup (by SKU/product code): ${JSON.stringify(summarizeProduct(product))}`);
        productFound = true;
      } else {
        productFound = false;
      }
    }

    if (orderEmailMismatch) {
      return Response.json({
        reply:
          "I found the order ID, but the email didn't match. Please confirm the email used at checkout.",
      });
    }

    if (wantsOrder && (orderId || email) && orderLookupFailed) {
      return Response.json({
        reply:
          "I couldn't find an order with that information. Please double-check the order ID and email.",
      });
    }

    if (wantsQuote && email && quoteLookupFailed) {
      return Response.json({
        reply:
          "I couldn't find any quote requests for that email. Please double-check the address you used.",
      });
    }

    if (productLookupPerformed && !productFound) {
      return Response.json({
        reply:
          "I couldn't find that SKU or product code in our catalog. Please check the code or share the product name.",
      });
    }

    const history = Array.isArray(messages)
      ? messages
          .filter((m) => m && typeof m.content === "string" && m.role !== "system")
          .slice(-10)
          .map((m) =>
            m.role === "assistant"
              ? new AIMessage(m.content)
              : new HumanMessage(m.content)
          )
      : [];

    const systemWithContext =
      contextNotes.length > 0
        ? `${systemPrompt}\n\nDatabase context:\n${contextNotes.join("\n")}`
        : systemPrompt;

    const response = await llm.invoke([
      new SystemMessage(systemWithContext),
      ...history,
      new HumanMessage(message),
    ]);

    return Response.json({ reply: response.content });
  } catch (error) {
    const status = error?.status || error?.response?.status;
    const message = String(error?.message || "");
    if (status === 429 || message.includes("429")) {
      const retryMatch = message.match(/retry in\s+([\d.]+)s/i);
      const retrySeconds = retryMatch ? Number(retryMatch[1]) : null;
      return Response.json(
        {
          reply:
            "The AI is temporarily rate-limited. Please wait a few seconds and try again.",
          retryAfterSeconds: retrySeconds,
        },
        { status: 429 }
      );
    }

    console.error("Agent chat error:", error);
    return Response.json(
      { reply: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
