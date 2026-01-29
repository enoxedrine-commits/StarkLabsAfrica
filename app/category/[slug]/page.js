// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { collection, getDocs, query, where } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import Link from "next/link";

// export default function CategoryPage() {
//   const { slug } = useParams();
//   const router = useRouter();
//   const [products, setProducts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [categoryName, setCategoryName] = useState("");

//   const decodeSlug = (slug) => slug.replace(/-/g, " ").toLowerCase();

//   useEffect(() => {
//     const fetchProductsByCategory = async () => {
//       setLoading(true);

//       try {
//         if (slug === "all-products") {
//           // 🟢 Handle All Products (virtual category)
//           setCategoryName("All Products");
//           const allSnapshot = await getDocs(collection(db, "products"));
//           const allProducts = allSnapshot.docs.map((doc) => ({
//             id: doc.id,
//             ...doc.data(),
//           }));
//           setProducts(allProducts);
//         } else {
//           // 🔍 Fetch actual categories to resolve slug
//           const categorySnapshot = await getDocs(collection(db, "categories"));
//           let resolvedName = "";

//           categorySnapshot.forEach((doc) => {
//             const name = doc.data().name;
//             const generatedSlug = name
//               .toLowerCase()
//               .replace(/\s+/g, "-")
//               .replace(/[^a-z0-9-]/g, "");

//             if (generatedSlug === slug) {
//               resolvedName = name;
//             }
//           });

//           if (resolvedName) {
//             setCategoryName(resolvedName);

//             const q = query(
//               collection(db, "products"),
//               where("category", "==", resolvedName)
//             );
//             const querySnapshot = await getDocs(q);
//             const filteredProducts = querySnapshot.docs.map((doc) => ({
//               id: doc.id,
//               ...doc.data(),
//             }));
//             setProducts(filteredProducts);
//           } else {
//             setCategoryName("Unknown Category");
//             setProducts([]);
//           }
//         }
//       } catch (error) {
//         console.error("Failed to fetch products:", error);
//         setCategoryName("Error");
//         setProducts([]);
//       }

//       setLoading(false);
//     };

//     fetchProductsByCategory();
//   }, [slug]);

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-4">
//       {/* <button
//         onClick={() => router.back()}
//         className="text-sm text-blue-600 mb-4 flex items-center"
//       >
//         ← Back 
//       </button> */}

//       <button
//         onClick={() => router.back()}
//         className="mb-4 top-[130px] right-2 z-50 px-4 py-2 bg-blue-100 text-blue-700 text-sm  shadow-sm hover:bg-blue-200 transition-all"
//       >
//         ← Back
//       </button>




//       <h2 className="text-2xl font-bold mb-4 text-gray-800">{categoryName}</h2>

//       {loading ? (
//         <p>Loading...</p>
//       ) : products.length === 0 ? (
//         <p>No products found in this category.</p>
//       ) : (
//         <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6">
//           {products.map(({ id, name, price, imageUrl }) => (
//             <Link key={id} href={`/product/${id}`} className="group">
//               <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden">
//                 <img
//                   src={imageUrl}
//                   alt={name}
//                   className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
//                 />
//               </div>
//               <div className="pt-2">
//                 <p className="text-sm font-regular text-gray-900 truncate">{name}</p>
//                 <p className="text-sm font-semibold text-gray-700">
//                   UGX {price?.toLocaleString?.()}
//                 </p>
//               </div>
//             </Link>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }























// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { collection, getDocs, query, where } from "firebase/firestore";
// import { db } from "@/lib/firebase";
// import Link from "next/link";

// export default function CategoryPage() {
//   const { slug } = useParams();
//   const router = useRouter();

//   const [products, setProducts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [categoryName, setCategoryName] = useState("");

//   useEffect(() => {
//     const fetchProductsByCategorySlug = async () => {
//       setLoading(true);

//       try {
//         if (slug === "all-products") {
//           // Show everything
//           setCategoryName("All Products");
//           const allSnapshot = await getDocs(collection(db, "products"));
//           const allProducts = allSnapshot.docs.map((doc) => ({
//             id: doc.id,
//             ...doc.data(),
//           }));
//           setProducts(allProducts);
//         } else {
//           // Get category with matching slug
//           const categoriesSnapshot = await getDocs(collection(db, "categories"));
//           let matchedCategory = null;

//           categoriesSnapshot.forEach((doc) => {
//             const data = doc.data();
//             if (data.slug === slug) {
//               matchedCategory = { id: doc.id, ...data };
//             }
//           });

//           if (!matchedCategory) {
//             setCategoryName("Unknown Category");
//             setProducts([]);
//             setLoading(false);
//             return;
//           }

//           setCategoryName(matchedCategory.name);

//           // Now get products with that category ID
//           const q = query(
//             collection(db, "products"),
//             where("category", "==", matchedCategory.id)
//           );

//           const querySnapshot = await getDocs(q);
//           const filteredProducts = querySnapshot.docs.map((doc) => ({
//             id: doc.id,
//             ...doc.data(),
//           }));

//           setProducts(filteredProducts);
//         }
//       } catch (err) {
//         console.error("Failed to load products:", err);
//         setCategoryName("Error");
//         setProducts([]);
//       }

//       setLoading(false);
//     };

//     fetchProductsByCategorySlug();
//   }, [slug]);

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-4">
//       <button
//         onClick={() => router.back()}
//         className="mb-4 top-[130px] right-2 z-50 px-4 py-2 bg-blue-100 text-blue-700 text-sm shadow-sm hover:bg-blue-200 transition-all"
//       >
//         ← Back
//       </button>

//       <h2 className="text-2xl font-bold mb-4 text-gray-800">{categoryName}</h2>

//       {loading ? (
//         <p>Loading...</p>
//       ) : products.length === 0 ? (
//         <p>No products found in this category.</p>
//       ) : (
//         <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6">
//           {products.map(({ id, name, price, imageUrl }) => (
//             <Link key={id} href={`/product/${id}`} className="group">
//               <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden">
//                 <img
//                   src={imageUrl}
//                   alt={name}
//                   className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
//                 />
//               </div>
//               <div className="pt-2">
//                 <p className="text-sm font-regular text-gray-900 truncate">{name}</p>
//                 <p className="text-sm font-semibold text-gray-700">
//                   UGX {price?.toLocaleString?.()}
//                 </p>
//               </div>
//             </Link>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }






















"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { getPreferredImageUrl } from "@/lib/imageUtils";

export default function CategoryPage() {
  const { slug } = useParams();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState("");

  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [categoryId, setCategoryId] = useState(null);

  useEffect(() => {
    const fetchCategoryAndProducts = async () => {
      setLoading(true);

      try {
        const categorySnap = await getDocs(collection(db, "categories"));
        let currentCategory = null;
        const categories = [];

        categorySnap.forEach((doc) => {
          const data = doc.data();
          categories.push({ id: doc.id, ...data });
          if (data.slug === slug) {
            currentCategory = { id: doc.id, ...data };
          }
        });

        if (!currentCategory) {
          setCategoryName("Unknown Category");
          setProducts([]);
          return;
        }

        setCategoryName(currentCategory.name);
        setCategoryId(currentCategory.id);

        // Load subcategories
        const subCats = categories.filter(
          (cat) => cat.parentId === currentCategory.id
        );
        setSubcategories(subCats);

        // Load products in category
        const productSnap = await getDocs(
          query(collection(db, "products"), where("category", "==", currentCategory.id))
        );

        let allProducts = productSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter by subcategory if selected
        if (selectedSubCategory) {
          allProducts = allProducts.filter(
            (p) => p.subCategory === selectedSubCategory
          );
        }

        setProducts(allProducts);
      } catch (error) {
        console.error("Error loading category products:", error);
        setProducts([]);
      }

      setLoading(false);
    };

    fetchCategoryAndProducts();
  }, [slug, selectedSubCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* <button
        onClick={() => router.back()}
        className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 text-sm shadow-sm hover:bg-blue-200 transition-all"
      >
        ← Back
      </button> */}

      <h2 className="text-xl sm:text-2xl font-bold mb-3 text-gray-800">{categoryName}</h2>

      {/* Subcategory Buttons */}
      {subcategories.length > 0 && (
        <div className="overflow-x-auto no-scrollbar mb-4">
          <div className="flex gap-2 w-max">
            {/* Default All button */}
            <button
              onClick={() => setSelectedSubCategory(null)}
              className={`px-3 py-1 rounded-full text-xs border whitespace-nowrap transition-all ${
                selectedSubCategory === null
                 ? "bg-sky-600 text-white border-sky-700"
                  : "bg-gray-100 text-gray-700 border-gray-300"
              }`}
            >
              All
            </button>

            {subcategories.map((subcat) => (
              <button
                key={subcat.id}
                onClick={() =>
                  setSelectedSubCategory(
                    selectedSubCategory === subcat.id ? null : subcat.id
                  )
                }
                className={`px-3 py-1 rounded-full text-xs border whitespace-nowrap transition-all ${
                  selectedSubCategory === subcat.id
                   ? "bg-sky-600 text-white border-sky-700"
                    : "bg-gray-100 text-gray-700 border-gray-300"
                }`}
              >
                {subcat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : products.length === 0 ? (
        <p>Sorry!  No products found in this category.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,11rem)] gap-4 justify-start">
          {products.map(({ id, name, price, imageUrl }) => (
            <Link key={id} href={`/product/${id}`} className="group block w-44">
              <div className="flex flex-col">
                <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={getPreferredImageUrl(imageUrl, "200x200")}
                    alt={name}
                    className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                  />
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-[#255cdc] line-clamp-2">{name}</p>
                  <p className="text-sm text-gray-500">UGX {price?.toLocaleString?.() ?? "N/A"}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
