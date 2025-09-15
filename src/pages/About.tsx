import React, { useState, useEffect } from 'react';
import { Code, Users, Shield, Zap, FolderOpen, Github, X } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import rileyImage from '@/img/RILEY_PFP.png';
import michaelImage from '@/img/MICHAEL_PFP.jpg';

interface TeamMember {
  name: string;
  role: string;
  description: string;
  github: string;
  image?: string;
  color: string;
  detailedDescription?: string;
}

const Modal = ({ isOpen, onClose, member }: { isOpen: boolean; onClose: () => void; member: TeamMember }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-6 py-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                {member.image ? (
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-full ${member.color} flex items-center justify-center text-white text-xl font-bold`}>
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-blue-500">{member.role}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {member.detailedDescription || member.description}
              </p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {member.github && (
              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-500 text-base font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                <Github className="h-5 w-5 mr-2" />
                GitHub Profile
              </a>
            )}
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const About = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const { user } = useAuth();

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      setTheme(systemPrefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  const features = [
    {
      icon: <Code className="w-8 h-8 mb-4 text-blue-500" />,
      title: "Real-time Code Editor",
      description: "Write and edit code with syntax highlighting for multiple programming languages in a clean, distraction-free interface."
    },
    {
      icon: <Users className="w-8 h-8 mb-4 text-green-500" />,
      title: "Collaborative Environment",
      description: "Work together with your team in real-time. See changes as they happen and communicate seamlessly."
    },
    {
      icon: <FolderOpen className="w-8 h-8 mb-4 text-purple-500" />,
      title: "Project Management",
      description: "Organize your projects with an intuitive file explorer and easily manage your codebase."
    },
    {
      icon: <Shield className="w-8 h-8 mb-4 text-blue-500" />,
      title: "Secure Code Execution",
      description: "Your code runs in a secure sandbox environment, ensuring safe execution without compromising your system's security."
    }
  ];

  const teamMembers: TeamMember[] = [
    {
      name: "Riley Sweeting",
      role: "Developer",
      description: "Hey there! I'm Riley Sweeting, an aspiring Software Engineer with a passion for AI-powered automation and workflow orchestration.",
      detailedDescription: "MocsCode has been an incredible learning experience! It allowed me to refine my full-stack development skills and dive into DevOps. Working with Gen-AI coding assistants taught me effective prompt engineering, which significantly boosted our productivity and enabled us to learn so much!\n\nI'm incredibly proud of MocsCode so far, and I'm excited to see how it continues to grow. I hope you enjoy using MocsCode as much as I've enjoyed building it!",
      github: "https://github.com/RileySweeting",
      image: rileyImage,
      color: "bg-blue-500"
    },
    {
      name: "Michael Durden",
      role: "Developer",
      description: "Hello! I'm Michael Durden, a creative that's found interest in Software Engineering. I am passionate about being creative, and love to make things, and I've found some of that passion in building this application.",
      detailedDescription: "Working on MocsCode has been an amazing journey in collaborative development. I've learned so much about building scalable applications and working with modern tools and how to balance collaborative work. This has been such a wonderful project to work on that allowed me to be both technical and creative, and I can't imagine working on it with any other team.",
      github: "https://github.com/masterjedidcfl",
      image: michaelImage,
      color: "bg-purple-500"
    },
    {
      name: "Cazalas",
      role: "Supervisor",
      description: "Professor at Florida Southern College. Is passionate about students putting their all into their work and seeing how AI tools can help elevate the Software Engineering space.",
      detailedDescription: "Cazalas has been nothing but a great supporter for our team! He always held the upmost admiration for the work we put into this project. We'd also like to extend a great thank you to his son, Ibraheem, who has done so much work to ensure that our site could be properly deployed. Thank you, and continue to watch over us as we continue to improve MocsCode!",
      github: "",
      initials: "CZ",
      color: "bg-green-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
            About{' '}
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              MocsCode
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10">
            Empowering developers to collaborate and build amazing projects together.
          </p>
          <div className="flex justify-center gap-4">
            {!user && (
              <Link 
                to="/signin" 
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:shadow-md focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:bg-blue-600"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Why Choose MocsCode?</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              We provide the tools you need to collaborate and code your projects as a team.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-slate-800/40 dark:backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-all duration-200">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-gray-100/50 dark:bg-gray-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Our Team</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Meet the team behind MocsCode
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-slate-800/40 dark:backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg p-6 flex flex-col h-full hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-400 dark:hover:border-blue-400"
                onClick={() => setSelectedMember(member)}
              >
                <div className="flex flex-col items-center text-center flex-grow">
                  <div className="w-20 h-20 mx-auto mb-4 overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-600">
                    {member.image ? (
                      <img 
                        src={member.image} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = 
                              `<div class="w-full h-full ${member.color} flex items-center justify-center text-white text-lg font-bold">
                                ${member.name.split(' ').map(n => n[0]).join('')}
                              </div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className={`w-full h-full ${member.color} flex items-center justify-center text-white text-lg font-bold`}>
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-blue-500 mb-2 font-medium">{member.role}</p>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{member.description}</p>
                </div>
                {member.github && (
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                    <a 
                      href={member.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-500 transition-colors duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 bg-gray-100/50 dark:bg-gray-800/20">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Ready to get started?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Join thousands of developers already using MocsCode to build amazing projects together.
            </p>
            <Link 
              to="/register"
              className="inline-block bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-medium hover:shadow-md focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            >
              Create Free Account
            </Link>
          </div>
        </section>
      )}

      {/* Team Member Modal */}
      {selectedMember && (
        <Modal
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          member={selectedMember}
        />
      )}
    </div>
  );
};

export default About;