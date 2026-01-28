"use client";

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import SearchBar from "@/components/SearchBar";
import CachedLogo from "@/components/CachedLogo";
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, getDocs } from "firebase/firestore";
import { ShoppingCartIcon, ChatBubbleLeftEllipsisIcon, BellIcon } from "@heroicons/react/24/outline";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [notificationItems, setNotificationItems] = useState([]);
  const dropdownRef = useRef();
  const showSearch = ["/category", "/shop", "/search"].some((path) => pathname.startsWith(path)) || pathname === "/";

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Listen for cart count realtime updates if user logged in
  useEffect(() => {
    if (!user) {
      setCartCount(0);
      return;
    }
    const itemsRef = collection(db, "carts", user.uid, "items");
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      setCartCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  // Listen for unread messages sent to this user (exclude system/notification)
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }

    const qMsgs = collection(db, "messages");
    const unsubscribe = onSnapshot(qMsgs, (snapshot) => {
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

  // Listen for notifications (system/notification messages addressed to user)
  useEffect(() => {
    if (!user) {
      setNotifications(0);
      setNotificationItems([]);
      return;
    }
    const qNotifs = query(
      collection(db, "messages"),
      where("to", "==", user.uid),
      where("type", "in", ["system", "notification"]) // Firestore 'in' supports up to 10 values
    );
    const unsubscribe = onSnapshot(qNotifs, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const unread = items.filter((i) => !i.read).length;
      setNotificationItems(items.sort((a,b) => (a.timestamp?.toMillis?.()||0) - (b.timestamp?.toMillis?.()||0)).reverse());
      setNotifications(unread);
    });
    return () => unsubscribe();
  }, [user]);

  // Mark notifications as read when dropdown opens
  useEffect(() => {
    const markRead = async () => {
      if (!user || !openNotifications) return;
      const unread = notificationItems.filter((n) => !n.read);
      for (const n of unread) {
        try {
          // Mark as read in messages collection
          await updateDoc(doc(db, "messages", n.id), { read: true });
          
          // Also mark as read in notifications collection if it exists
          // We need to find the corresponding notification by messageId
          const notificationsQuery = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            where("messageId", "==", n.id)
          );
          const notificationsSnapshot = await getDocs(notificationsQuery);
          if (!notificationsSnapshot.empty) {
            const notificationDoc = notificationsSnapshot.docs[0];
            await updateDoc(doc(db, "notifications", notificationDoc.id), {
              read: true,
              readAt: new Date(),
            });
            console.log("✅ Synced read status to notifications collection:", notificationDoc.id);
          }
        } catch (e) {
          console.warn("Failed to mark notification read", e);
        }
      }
    };
    markRead();
  }, [openNotifications, user, notificationItems]);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/register");
    } catch (error) {
      console.error("Logout error", error.message);
    }
  };




  return (
    <>
      <header 
        className="fixed top-0 left-0 right-0 z-[100] bg-white" 
        style={{ 
          borderBottom: '1px solid #D5D9D9',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' 
        }}
      >
        <div className="max-w-7xl mx-auto px-4" style={{ height: '72px' }}>
          <div className="flex items-center justify-between gap-4 h-full">
            {/* Logo */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <CachedLogo
                variant="default"
                className="h-12 md:h-14 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push("/")}
                priority={true}
              />
            </div>
            
            {/* Search Bar - Desktop */}
            {showSearch && (
              <div className="flex-1 hidden md:block min-w-0 mx-4">
                <SearchBar />
              </div>
            )}

            {/* User Actions */}
            <div className="flex items-center gap-0 relative" ref={dropdownRef}>
              {/* Notifications - only when logged in */}
              {user && (
                <>
                  <button 
                    onClick={() => setOpenNotifications((o) => !o)} 
                    className="relative focus:outline-none p-2 rounded-lg transition-all" 
                    style={{ 
                      color: 'var(--text-secondary)',
                      transition: 'all 0.3s ease' 
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent-orange)';
                      e.currentTarget.style.background = '#FFF5E6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                    aria-label="Notifications"
                  >
                    <BellIcon className="h-6 w-6" />
                    {notifications > 0 && (
                      <span className="absolute top-1 right-1 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none" style={{ background: 'var(--accent-red)', boxShadow: '0 0 8px rgba(198, 40, 40, 0.5)' }}>
                        {notifications}
                      </span>
                    )}
                  </button>
                  {openNotifications && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-80 rounded z-50 max-h-80 overflow-auto bg-white" 
                      style={{ 
                        border: '1px solid #D5D9D9',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' 
                      }}
                    >
                      <div className="p-3 font-semibold text-xs" style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>Notifications</div>
                      {notificationItems.length === 0 ? (
                        <div className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>No notifications</div>
                      ) : (
                        <ul style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          {notificationItems.slice(0,20).map((n) => (
                            <li 
                              key={n.id} 
                              className="p-3 text-sm transition-colors"
                              style={{ borderBottom: '1px solid var(--border-subtle)' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#F5F5F5';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <button
                                className="text-left w-full"
                                onClick={() => {
                                  setOpenNotifications(false);
                                  const target = n.target || (n.orderId ? `/order/${n.orderId}` : "/order?tab=submitted");
                                  router.push(target);
                                }}
                              >
                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{n.title || 'Update'}</p>
                                <p style={{ color: 'var(--text-secondary)' }}>{n.text || n.body}</p>
                                {n.timestamp && (
                                  <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp.toMillis()).toLocaleString()}</p>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Cart Icon */}
              {user && cartCount > 0 && (
                  <button
                  onClick={() => router.push("/order")}
                  className="relative focus:outline-none p-2 rounded-lg transition-all"
                  style={{ 
                    color: 'var(--text-secondary)',
                    transition: 'all 0.3s ease' 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FF9900';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  aria-label="View cart"
                >
                  <ShoppingCartIcon className="h-6 w-6" />
                  <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
                    {cartCount}
                  </span>
                </button>
              )}

              {/* Message Icon */}
              {user && unreadMessages > 0 && (
                <button
                  onClick={() => router.push("/messenger")}
                  className="relative focus:outline-none p-2 rounded-lg transition-all"
                  style={{ 
                    color: 'var(--text-secondary)',
                    transition: 'all 0.3s ease' 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FF9900';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  aria-label="View messages"
                >
                  <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
                  <span className="absolute top-1 right-1 bg-green-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
                    {unreadMessages}
                  </span>
                </button>
              )}

              {/* User Avatar or Sign In */}
              {user ? (
                <>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded transition-colors border border-transparent hover:border-gray-300"
                  >
                    <img
                      src={user.photoURL || "/default-avatar.png"}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="hidden lg:block text-sm font-medium text-gray-700">
                      {user.displayName || "User"}
                    </span>
                  </button>

                  {menuOpen && (
                    <div 
                      className="absolute right-0 top-full mt-2 rounded z-50 overflow-hidden bg-white"
                      style={{
                        width: '280px',
                        border: '1px solid #D5D9D9',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center space-x-3 min-w-0">
                          <img
                            src={user.photoURL || "/default-avatar.png"}
                            alt="User"
                            className="w-10 h-10 rounded-full flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {user.displayName || "User"}
                            </p>
                            <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            router.push("/account");
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F5F5F5';
                            e.currentTarget.style.color = 'var(--accent-orange)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          Account Details
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            router.push("/dashboard");
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F5F5F5';
                            e.currentTarget.style.color = 'var(--accent-orange)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          My Dashboard
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            router.push("/order");
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F5F5F5';
                            e.currentTarget.style.color = 'var(--accent-orange)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          My Orders
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            router.push("/wishlist");
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F5F5F5';
                            e.currentTarget.style.color = 'var(--accent-orange)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          My Wishlist
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            router.push("/compare");
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F5F5F5';
                            e.currentTarget.style.color = 'var(--accent-orange)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          Compare Products
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            router.push("/agent-chat");
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg transition-all"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F5F5F5';
                            e.currentTarget.style.color = 'var(--accent-orange)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                        >
                          Customer Service Chat
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 text-sm rounded-lg transition-all"
                          style={{ color: 'var(--accent-red)' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(198, 40, 40, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => router.push("/register")}
                  className="bg-[#FF9900] text-white hover:bg-[#E88900] transition-colors px-4 py-2 text-sm rounded font-medium"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Search Bar - Mobile */}
          {showSearch && (
            <div className="block md:hidden mt-1">
              <SearchBar />
            </div>
          )}
        </div>
      </header>
    </>
  );
}
