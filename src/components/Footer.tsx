import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-6
          ">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About Us
            </Link>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground md:mt-0">
            &copy; {new Date().getFullYear()} MocsCode. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
