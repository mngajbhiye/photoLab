import { memo } from "react";
import { Mail } from "lucide-react";
import { FaYoutube, FaXTwitter } from "react-icons/fa6";

const COMPANY_NAME = "PHOTO LAB";

// const CONTACT_INFO = [{ Icon: Mail, text: "info@photolab.com" }];

const QUICK_LINKS = ["Product Categories", "About Us", "Contact Us"];

const POLICIES = ["Privacy Policy", "Terms & Conditions"];

const SOCIAL_LINKS = [
  { Icon: FaXTwitter, href: "#" },
  { Icon: Mail, href: "#" },
  { Icon: FaYoutube, href: "#" },
];

// 🔹 Types
type IconType = React.ElementType;

interface ContactItemProps {
  Icon: IconType;
  text: string;
}

interface LinkItemProps {
  text: string;
}

interface SocialIconProps {
  Icon: IconType;
  href: string;
}

// 🔹 Components
const ContactItem = memo(({ Icon, text }: ContactItemProps) => (
  <div className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-300">
    <Icon size={16} />
    <span>{text}</span>
  </div>
));

ContactItem.displayName = "ContactItem";

const LinkItem = memo(({ text }: LinkItemProps) => (
  <li>
    <a
      href="#"
      className="text-gray-400 hover:text-white transition-colors duration-300 block transform hover:scale-101"
    >
      {text}
    </a>
  </li>
));

LinkItem.displayName = "LinkItem";

const SocialIcon = memo(({ Icon, href }: SocialIconProps) => (
  <a
    href={href}
    className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors duration-300 transform hover:scale-110"
  >
    <Icon size={20} />
  </a>
));

SocialIcon.displayName = "SocialIcon";

// 🔹 Footer Component
const Footer: React.FC = () => (
  <footer className="bg-gray-900 text-white p-4 w-full">
    <div className="w-full mx-0 px-4 sm:px-0 lg:px-10 text-center justify-center lg:text-left lg:h-40 leading-loose">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-9 gap-8">
        {/* Company Info */}
        <div className="sm:col-span-2 lg:col-span-3 space-y-4">
          <h2 className="text-2xl hover:text-gray-300 transition-colors duration-300">
            {COMPANY_NAME}
          </h2>

          <div className="space-y-2 mx-auto flex flex-col items-center lg:items-start">
            Developed by Mohit Gajbhiye
          </div>
        </div>

        {/* Quick Links */}
        <div className="sm:col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <ul className="space-y-2">
            {QUICK_LINKS.map((link) => (
              <LinkItem key={link} text={link} />
            ))}
          </ul>
        </div>

        {/* Policies */}
        <div className="sm:col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Policies</h3>
          <ul className="space-y-2">
            {POLICIES.map((policy) => (
              <LinkItem key={policy} text={policy} />
            ))}
          </ul>
        </div>

        {/* Social */}
        <div className="sm:col-span-2 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
          <div className="flex flex-nowrap gap-2 items-center">
            {SOCIAL_LINKS.map((social, index) => (
              <SocialIcon key={index} Icon={social.Icon} href={social.href} />
            ))}
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
        <p>
          © {new Date().getFullYear()} {COMPANY_NAME}. All Rights Reserved.
        </p>
      </div>
    </div>
  </footer>
);

Footer.displayName = "Footer";

export default Footer;
