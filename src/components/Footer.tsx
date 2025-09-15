import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm text-slate-400 text-center">
            &copy; {new Date().getFullYear()} MocsCode. Empowering collaborative development.
          </p>
          <div className="pt-2">
            <Link to="/about" className="text-sm text-slate-300 hover:text-white transition-colors">
              About Us
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
