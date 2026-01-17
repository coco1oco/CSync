import {
  Globe,
  InstagramIcon,
  FacebookIcon,
  Mail,
  ExternalLink,
  Heart,
  Shield,
  FileText,
} from "lucide-react";

export function About() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* 1. Header & Brand Card */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">About PawPal</h2>
          <p className="text-sm text-gray-500">
            Connecting pets, people, and communities.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center p-10 bg-gradient-to-b from-blue-50/50 to-white rounded-2xl border border-gray-100 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-100/20 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-md border border-gray-100 flex items-center justify-center mb-5 mx-auto">
              <img
                src="/Pawpal.svg"
                alt="PawPal Logo"
                className="w-14 h-14 object-contain"
              />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
              PawPal
            </h3>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="text-xs font-medium text-blue-700">
                v1.0.0 (Beta)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Mission Text */}
      <div className="prose prose-sm text-gray-600 max-w-none">
        <h4 className="text-gray-900 font-semibold mb-2">Our Mission</h4>
        <p className="leading-relaxed">
          PawPal was created to bridge the gap between pet owners, veterinary
          professionals, and animal lovers. We believe that every pet deserves
          the best care, and every owner deserves a supportive community.
        </p>
      </div>

      {/* 3. Social & Contact Grid */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Connect with us</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* --- WEBSITE (Updated to BLACK Hover) --- */}
          <a
            href="https://paws.org.ph/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-black transition-all group hover:shadow-sm"
          >
            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg group-hover:bg-gray-900 group-hover:text-white transition-colors">
              <Globe size={18} />
            </div>
            <div className="text-sm">
              <span className="block font-medium text-gray-900">Website</span>
              <span className="text-gray-500 text-xs">paws.org.ph/</span>
            </div>
            <ExternalLink
              size={14}
              className="ml-auto text-gray-300 group-hover:text-black"
            />
          </a>

          {/* --- INSTAGRAM --- */}
          <a
            href="https://www.instagram.com/youthforanimals.cvsumain/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-pink-300 hover:shadow-sm transition-all group"
          >
            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg group-hover:bg-pink-50 group-hover:text-pink-600 transition-colors">
              <InstagramIcon size={18} />
            </div>
            <div className="text-sm">
              <span className="block font-medium text-gray-900">Instagram</span>
              <span className="text-gray-500 text-xs">
                @youthforanimals.cvsumain
              </span>
            </div>
            <ExternalLink
              size={14}
              className="ml-auto text-gray-300 group-hover:text-pink-400"
            />
          </a>

          {/* --- FACEBOOK --- */}
          <a
            href="https://www.facebook.com/YFA.CvSU"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all group"
          >
            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
              <FacebookIcon size={18} />
            </div>
            <div className="text-sm">
              <span className="block font-medium text-gray-900">Facebook</span>
              <span className="text-gray-500 text-xs">
                Youth For Animals - CvSU Main Campus
              </span>
            </div>
            <ExternalLink
              size={14}
              className="ml-auto text-gray-300 group-hover:text-blue-500"
            />
          </a>

          {/* --- EMAIL (Updated to ORANGE Hover) --- */}
          <a
            href="https://mail.google.com/mail/u/0/#inbox?compose=CllgCJlDTckLZKWJFgGMdlxPkdCHMQJvDFnnsqbTbCkfHjmPGDpHsHCVNwZxJBXZqMZHlCSHnwg"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-sm transition-all group"
          >
            <div className="p-2 bg-gray-50 text-gray-600 rounded-lg group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
              <Mail size={18} />
            </div>
            <div className="text-sm">
              <span className="block font-medium text-gray-900">
                Email Support
              </span>
              <span className="text-gray-500 text-xs">
                yfa.main2025@gmail.com
              </span>
            </div>
          </a>
        </div>
        {/* 3. Social & Contact Grid */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ... (Your existing Website, Instagram, Facebook, and Email links) ... */}
          </div>

          {/* --- LOWKEY DEVELOPER SECTION --- */}
          <div className="mt-16 pt-8 border-t border-gray-100/60">
            <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-6">
              <h4 className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                Engineered by CSync
              </h4>
              <div className="h-px flex-1 bg-gray-100 hidden md:block" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                "Kurt Michael Mirafelix",
                "Alexander Jove Mikael Simpelo",
                "Charlize Ellaine Dizor",
                "Kurt Cadorna",
              ].map((name) => (
                <div key={name} className="flex items-center gap-3 group">
                  <div className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-blue-400 transition-colors" />
                  <span className="text-[13px] text-gray-500 group-hover:text-gray-900 transition-colors duration-300">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Footer & Legal */}
      <div className="pt-6 border-t border-gray-100 space-y-6">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
          <a
            href="#"
            className="hover:text-gray-900 hover:underline flex items-center gap-1.5"
          >
            <FileText size={14} /> Terms of Service
          </a>
          <a
            href="#"
            className="hover:text-gray-900 hover:underline flex items-center gap-1.5"
          >
            <Shield size={14} /> Privacy Policy
          </a>
        </div>

        <div className="text-center space-y-2">
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            Made with <Heart size={12} className="text-red-400 fill-red-400" />{" "}
            for pets everywhere
          </p>
          <p className="text-[10px] text-gray-300 uppercase tracking-widest">
            © 2025 PawPal Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
