// "use client";

// import Navbar from "@/components/Navbar";
// import Footer from "@/components/Footer";
// import { usePathname, useRouter } from "next/navigation";
// import { Toaster } from "sonner";
// import { useEffect, useState } from "react";
// import { onAuthStateChanged, getAuth } from "firebase/auth";
// import { collection, onSnapshot } from "firebase/firestore";
// import { db } from "@/lib/firebase";

// // Import Heroicons React components
// import {
//   HomeIcon,
//   Squares2X2Icon,
//   ChatBubbleLeftEllipsisIcon,
//   ShoppingBagIcon,
//   UserCircleIcon,
// } from "@heroicons/react/24/outline";

// export default function ClientLayoutWrapper({ children }) {
//   const pathname = usePathname();
//   const router = useRouter();

//   const hideNavbarOn = ["/register", "/login", "/messenger"];
//   const hideFooterOn = ["/order", "/categories", "/register", "/messenger", "/account", "/admin"];
//   const hideMobileNavOn = ["/admin", "/login", "/register", "/messenger"];

//   const showNavbar = !hideNavbarOn.includes(pathname);
//   const showFooter = !hideFooterOn.includes(pathname);
//   const auth = getAuth();

//   const [user, setUser] = useState(null);
//   const [orderCount, setOrderCount] = useState(0);

//   const showMobileNav = user && !hideMobileNavOn.includes(pathname);

//   // Replace icons with Heroicons components
//   const navItems = [
//     { label: "Home", href: "/", Icon: HomeIcon },
//     { label: "Categories", href: "/categories", Icon: Squares2X2Icon },
//     { label: "Messenger", href: "/messenger", Icon: ChatBubbleLeftEllipsisIcon },
//     { label: "Orders", href: "/order", Icon: ShoppingBagIcon },
//     { label: "My Account", href: "/account", Icon: UserCircleIcon },
//   ];

//   // Auth listener
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//     });
//     return () => unsubscribe();
//   }, [auth]);

//   // Cart items count listener
//   useEffect(() => {
//     if (!user) {
//       setOrderCount(0);
//       return;
//     }

//     const itemsRef = collection(db, "carts", user.uid, "items");

//     const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
//       setOrderCount(snapshot.size);
//     });

//     return () => unsubscribe();
//   }, [user]);

//   return (
//     <>
//       {showNavbar && <Navbar />}
//       <main>{children}</main>
//       <Toaster richColors position="top-center" />

//       {/* Mobile Bottom Navigation */}
//       {showMobileNav && (
//         <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-inner border-t border-gray-200 z-50">
//           <div className="flex justify-between items-center px-4 py-2 text-xs text-gray-600">
//             {navItems.map(({ label, href, Icon }, idx) => (
//               <button
//                 key={idx}
//                 onClick={() => router.push(href)}
//                 className={`relative flex flex-col items-center flex-1 hover:text-blue-500 ${
//                   pathname === href ? "text-blue-600 font-medium" : ""
//                 }`}
//               >
//                 <Icon className="h-6 w-6 mb-1" aria-hidden="true" />
//                 {label}
//                 {label === "Orders" && orderCount > 0 && (
//                   <span className="absolute top-0 right-3 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
//                     {orderCount}
//                   </span>
//                 )}
//               </button>
//             ))}
//           </div>
//         </nav>
//       )}

//       {showFooter && <Footer />}
//     </>
//   );
// }







"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Import Heroicons React components
import {
  ChatBubbleLeftRightIcon,
  HomeIcon,
  Squares2X2Icon,
  ChatBubbleLeftEllipsisIcon,
  ShoppingCartIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useNavigationLoading } from "@/components/NavigationLoader";

export default function ClientLayoutWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const hideNavbarOn = ["/register", "/login", "/messenger", "/admin", "/agent-chat"];
  const hideFooterOn = ["/order", "/categories", "/register", "/messenger", "/account", "/admin", "/admin/chat", "/agent-chat"];
  const hideMobileNavOn = ["/admin", "/login", "/register", "/messenger", "/agent-chat"];

  const showNavbar = !hideNavbarOn.includes(pathname) && !pathname.startsWith('/admin');
  const showFooter = !hideFooterOn.includes(pathname) && !pathname.startsWith('/admin');
  const auth = getAuth();
  const { navigateTo } = useNavigationLoading();

  const [user, setUser] = useState(null);
  const [orderCount, setOrderCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const previousPathRef = useRef(pathname);
  const clickSaveHandler = useRef(null);

  const showMobileNav = user && !hideMobileNavOn.includes(pathname) && !pathname.startsWith('/admin');

  const navItems = [
    { label: "Home", href: "/", icon: HomeIcon },
    { label: "Categories", href: "/categories", icon: Squares2X2Icon },
    { label: "Messenger", href: "/messenger", icon: ChatBubbleLeftEllipsisIcon },
    { label: "Orders", href: "/order", icon: ShoppingCartIcon },
    { label: "My Account", href: "/account", icon: UserCircleIcon },
  ];

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [auth]);

  // Listen for real-time updates on cart items for the current user
  useEffect(() => {
    if (!user) {
      setOrderCount(0);
      return;
    }
    const itemsRef = collection(db, "carts", user.uid, "items");
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      setOrderCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  // Listen for unread messages count for the current user (exclude system/notification)
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }
    const q = collection(db, "messages");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (
          data.to === user.uid &&
          !data.read &&
          data.type !== "system" &&
          data.type !== "notification"
        ) {
          count++;
        }
      });
      setUnreadMessages(count);
    });
    return () => unsubscribe();
  }, [user]);



  // Listen for service worker navigation messages (for push notification clicks)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleServiceWorkerMessage = (event) => {
      console.log('[ClientLayoutWrapper] Received message:', event.data);

      if (event.data && event.data.type === 'NAVIGATE_TO') {
        const targetUrl = event.data.url;
        console.log('[ClientLayoutWrapper] Received navigation message from SW:', targetUrl);

        try {
          // Use Next.js router for client-side navigation
          console.log('[ClientLayoutWrapper] Attempting router navigation to:', targetUrl);
          router.push(targetUrl);
          console.log('[ClientLayoutWrapper] Navigation completed to:', targetUrl);
        } catch (error) {
          console.error('[ClientLayoutWrapper] Router navigation failed:', error);
          // Fallback to window.location with small delay
          try {
            setTimeout(() => {
              console.log('[ClientLayoutWrapper] Using window.location fallback to:', targetUrl);
              window.location.href = targetUrl;
            }, 100);
          } catch (fallbackError) {
            console.error('[ClientLayoutWrapper] Fallback navigation failed:', fallbackError);
          }
        }
      }
    };

    console.log('[ClientLayoutWrapper] Setting up message listener');
    // Listen for messages from service worker
    window.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      console.log('[ClientLayoutWrapper] Removing message listener');
      window.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [router]);






  return (
    <>
      {showNavbar && <Navbar />}
      {/* Spacer for fixed navbar height so content isn't hidden (mobile has taller header with search) */}
      {showNavbar && <div className="h-[96px] md:h-[72px]"></div>}
      <main>
        {children}
      </main>
      <Toaster richColors position="top-center" />

      {/* Floating message (agent chat) button — above bottom nav, beside the bulb in top nav */}
      {showNavbar && !pathname.includes("/agent-chat") && (
        <Link
          href="/agent-chat"
          className="fixed right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-[#0865ff] text-white shadow-lg transition hover:bg-[#075ae6] md:bottom-8 md:right-6 bottom-24"
          aria-label="Chat with support"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6" aria-hidden="true" />
        </Link>
      )}

      {/* Mobile Bottom Navigation */}
      {showMobileNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-inner border-t border-gray-200 z-100 md:hidden">
          <div className="flex justify-between items-center px-4 py-4 text-xs text-gray-600">
            {navItems.map(({ label, href, icon: Icon }, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (pathname !== href) {
                    if (navigateTo) {
                      navigateTo(href);
                    } else {
                      router.push(href);
                    }
                  }
                }}
                className={`relative flex flex-col items-center flex-1 hover:text-blue-500 ${
                  pathname === href ? "text-blue-600 font-medium" : ""
                }`}
              >
                <Icon className="h-6 w-6 mb-1" aria-hidden="true" />
                {label}

                {/* Badge for Orders */}
                {label === "Orders" && orderCount > 0 && (
                  <span className="absolute top-0 right-3 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
                    {orderCount}
                  </span>
                )}

                {/* Badge for Messenger */}
                {label === "Messenger" && unreadMessages > 0 && (
                  <span className="absolute top-0 right-3 bg-green-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
                    {unreadMessages}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>
      )}

      {showFooter && <Footer />}
      {/* Mobile Footer Spacer - when footer is hidden; skip on /agent-chat to avoid external scrollbar */}
      {!showFooter && !pathname.includes("/agent-chat") && (
        <div className="block md:hidden h-20"></div>
      )}
    </>
  );
}
