'use client';
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/' })}
      className="p-2 rounded-full hover:bg-white/10 transition-colors text-red-500 hover:text-red-600"
      title="Logout"
    >
      <LogOut className="w-5 h-5" />
    </button>
  );
}
