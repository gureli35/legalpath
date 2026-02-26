"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navigation() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isActive = (path: string) => pathname === path;

    // Hide nav on chat page, karar detail, belge yazım, and dava yönetimi for full-height experience
    const isChatPage = pathname === '/asistan';
    const isKararPage = pathname.startsWith('/karar/');
    const isBelgePage = pathname === '/belge-yazim';
    const isDavalarPage = pathname === '/davalar';
    if (isChatPage || isKararPage || isBelgePage || isDavalarPage) return null;

    return (
        <>
            <nav className="sticky top-0 z-50 w-full border-b border-dark-charcoal/5 bg-rx-bg/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-1.5 font-serif text-[22px] text-dark-charcoal">
                        <span className="font-normal">Legal</span>
                        <span className="italic text-rx-red">Path</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden items-center gap-1 md:flex">

                        <Link
                            href="/search"
                            className={cn(
                                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                                isActive("/search")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            İçtihat Arama
                        </Link>
                        <Link
                            href="/asistan"
                            className={cn(
                                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                                isActive("/asistan")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            AI Asistan
                        </Link>
                        <Link
                            href="/belge-yazim"
                            className={cn(
                                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                                isActive("/belge-yazim")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            Belge Yazım
                        </Link>
                        <Link
                            href="/davalar"
                            className={cn(
                                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                                isActive("/davalar")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            Dava Yönetimi
                        </Link>
                        <Link
                            href="/isbirligi"
                            className={cn(
                                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                                isActive("/isbirligi")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            Küresel İşbirliği
                        </Link>
                        <Link
                            href="/on-gorusme"
                            className={cn(
                                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                                isActive("/on-gorusme")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            Ön Görüşme
                        </Link>
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden items-center gap-2.5 md:flex">
                        <Link
                            href="/asistan"
                            className="rounded-lg bg-white border border-dark-charcoal/10 px-4 py-2 text-[13px] font-medium text-dark-charcoal shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
                        >
                            Hemen Başla
                        </Link>
                    </div>

                    {/* Mobile */}
                    <div className="flex items-center gap-2 md:hidden">
                        <Link
                            href="/asistan"
                            className="rounded-lg bg-white border border-dark-charcoal/10 px-3.5 py-2 text-[13px] font-medium text-dark-charcoal"
                        >
                            Asistan
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-dark-charcoal hover:bg-dark-charcoal/5"
                        >
                            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 top-16 z-40 bg-rx-bg/95 backdrop-blur-md px-5 pt-6 md:hidden">
                    <div className="flex flex-col gap-1.5">

                        <Link
                            href="/search"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                isActive("/search")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal/60 hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            İçtihat Arama
                        </Link>
                        <Link
                            href="/asistan"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                isActive("/asistan")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal/60 hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            AI Asistan
                        </Link>
                        <Link
                            href="/belge-yazim"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                isActive("/belge-yazim")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal/60 hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            Belge Yazım
                        </Link>
                        <Link
                            href="/davalar"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                isActive("/davalar")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal/60 hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            Dava Yönetimi
                        </Link>
                        <Link
                            href="/isbirligi"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                isActive("/isbirligi")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal/60 hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            Küresel İşbirliği
                        </Link>
                        <Link
                            href="/on-gorusme"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                isActive("/on-gorusme")
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal"
                                    : "text-dark-charcoal/60 hover:bg-dark-charcoal/[0.03]"
                            )}
                        >
                            Ön Görüşme
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
