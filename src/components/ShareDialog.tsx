import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Mail, 
  Link, 
  Copy, 
  Check, 
  Loader2, 
  Trash2, 
  Calendar,
  Eye,
  Edit,
  Users,
  Clock,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShareableLink } from '@/lib/api/collaboration';
import { z } from 'zod';
import { exportProjectAsZip, downloadProjectZip } from '@/export_project';

// Validation schemas
const emailInviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['viewer', 'editor']),
  message: z.string().optional()
});

const shareLinkSchema = z.object({
  permissions: z.enum(['viewer', 'editor']),
  expiresIn: z.enum(['never', '7d', '30d', '90d'])
});

type EmailInviteForm = z.infer<typeof emailInviteSchema>;
type ShareLinkForm = z.infer<typeof shareLinkSchema>;

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    owner_id: string;
  };
  onMemberAdded?: (member: any) => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, project, onMemberAdded }) => {
  const { toast } = useToast();
  const { projectMembersApi, collaborationApi, projectsApi, projectFilesApi } = useApi();
  const { user } = useAuth();
  
  // State for email invitation
  const [emailForm, setEmailForm] = useState<EmailInviteForm>({
    email: '',
    role: 'viewer',
    message: ''
  });
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const [isInviting, setIsInviting] = useState(false);

  // State for shareable links
  const [linkForm, setLinkForm] = useState<ShareLinkForm>({
    permissions: 'viewer',
    expiresIn: 'never'
  });
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [existingLinks, setExistingLinks] = useState<ShareableLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // State for project export
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  // Load existing share links when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      loadExistingLinks();
    }
  }, [isOpen, user]);

  const loadExistingLinks = async () => {
    if (!user) return;
    
    setIsLoadingLinks(true);
    try {
      const { data, error } = await collaborationApi.listProjectShareLinks(project.id, user.id);
      if (error) {
        console.error('Error loading share links:', error);
        toast({
          title: 'Error',
          description: 'Failed to load existing share links',
          variant: 'destructive'
        });
        return;
      }
      setExistingLinks(data?.items || []);
    } catch (error) {
      console.error('Unexpected error loading share links:', error);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  // Email invitation handlers
  const handleEmailInputChange = (field: keyof EmailInviteForm, value: string) => {
    setEmailForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (emailErrors[field]) {
      setEmailErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEmailInvite = async () => {
    if (!user) return;

    // Validate form
    try {
      emailInviteSchema.parse(emailForm);
      setEmailErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setEmailErrors(newErrors);
        return;
      }
    }

    setIsInviting(true);
    try {
      // Calculate expiration date if needed
      const expiresAt = undefined; // You can add expiration logic here if needed
      
      const { data, error } = await collaborationApi.sendEmailInvitation(
        project.id,
        emailForm.email,
        emailForm.role,
        project.name,
        emailForm.message || undefined,
        expiresAt
      );

      if (error) {
        toast({
          title: 'Invitation Failed',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Invitation Sent! 📧',
        description: `${emailForm.email} has been sent an invitation email with ${emailForm.role} access.`,
        duration: 5000
      });

      // Reset form
      setEmailForm({ email: '', role: 'viewer', message: '' });
      
      // Reload existing links to show the newly created one
      await loadExistingLinks();

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsInviting(false);
    }
  };

  // Share link handlers
  const handleLinkInputChange = (field: keyof ShareLinkForm, value: string) => {
    setLinkForm(prev => ({ ...prev, [field]: value as any }));
    if (linkErrors[field]) {
      setLinkErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateExpirationDate = (expiresIn: string): Date | undefined => {
    if (expiresIn === 'never') return undefined;
    
    const now = new Date();
    switch (expiresIn) {
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      default:
        return undefined;
    }
  };

  const handleGenerateLink = async () => {
    if (!user) return;

    // Validate form
    try {
      shareLinkSchema.parse(linkForm);
      setLinkErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setLinkErrors(newErrors);
        return;
      }
    }

    setIsGeneratingLink(true);
    try {
      const expiresAt = calculateExpirationDate(linkForm.expiresIn);
      
      const { data, error } = await collaborationApi.generateShareableLink(
        project.id,
        linkForm.permissions,
        user.id,
        expiresAt
      );

      if (error) {
        toast({
          title: 'Link Generation Failed',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Share Link Created',
        description: `A new ${linkForm.permissions} link has been generated.`
      });

      // Reload links to show the new one
      await loadExistingLinks();

    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate share link. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = async (token: string) => {
    try {
      const shareUrl = `${window.location.origin}/join/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToken(token);
      toast({
        title: 'Link Copied',
        description: 'Share link has been copied to clipboard.'
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy link to clipboard.',
        variant: 'destructive'
      });
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!user) return;

    try {
      const { error } = await collaborationApi.revokeShareLink(linkId, user.id);
      
      if (error) {
        toast({
          title: 'Revoke Failed',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Link Revoked',
        description: 'Share link has been deactivated.'
      });

      // Reload links to reflect the change
      await loadExistingLinks();

    } catch (error) {
      console.error('Error revoking share link:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke share link.',
        variant: 'destructive'
      });
    }
  };

  const formatExpirationDate = (dateString?: string) => {
    if (!dateString) return 'Never expires';
    const date = new Date(dateString);
    return `Expires ${date.toLocaleDateString()}`;
  };

  const isLinkExpired = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const getPermissionIcon = (permission: string) => {
    return permission === 'editor' ? <Edit className="h-3 w-3" /> : <Eye className="h-3 w-3" />;
  };

  const getPermissionColor = (permission: string) => {
    return permission === 'editor' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-green-100 text-green-800 hover:bg-green-200';
  };

  // Handle project export
  const handleExportProject = async () => {
    if (!user) return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const { zipBlob, error } = await exportProjectAsZip({
        projectId: project.id,
        projectsApi,
        projectFilesApi,
        onProgress: (percent) => setExportProgress(percent),
        includeMetadata
      });
      
      if (error || !zipBlob) {
        throw error || new Error('Failed to generate ZIP file');
      }
      
      // Download the ZIP file
      downloadProjectZip(zipBlob, `${project.name}.zip`);
      
      toast({
        title: 'Export Successful',
        description: 'Your project has been exported successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error exporting project:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export project',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Share Project: {project.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="email">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Invite by Email
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link className="h-4 w-4 mr-2" />
              Shareable Link
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="h-4 w-4 mr-2" />
              Export Project
            </TabsTrigger>
          </TabsList>

          {/* Email Invitation Tab */}
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={emailForm.email}
                  onChange={(e) => handleEmailInputChange('email', e.target.value)}
                  className={emailErrors.email ? 'border-red-500' : ''}
                />
                {emailErrors.email && (
                  <p className="text-sm text-red-600 mt-1">{emailErrors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="role">Permission Level</Label>
                <Select 
                  value={emailForm.role} 
                  onValueChange={(value) => handleEmailInputChange('role', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Viewer</div>
                          <div className="text-sm text-gray-500">Can view and comment</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center space-x-2">
                        <Edit className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Editor</div>
                          <div className="text-sm text-gray-500">Can edit and share</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {emailErrors.role && (
                  <p className="text-sm text-red-600 mt-1">{emailErrors.role}</p>
                )}
              </div>

              <div>
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Hey! I'd like to invite you to collaborate on this project..."
                  value={emailForm.message}
                  onChange={(e) => handleEmailInputChange('message', e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleEmailInvite}
                disabled={isInviting || !emailForm.email}
                className="w-full"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Shareable Link Tab */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4">
              {/* Create New Link */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">Create New Share Link</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label>Permission Level</Label>
                    <Select 
                      value={linkForm.permissions} 
                      onValueChange={(value) => handleLinkInputChange('permissions', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <span>Viewer Access</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center space-x-2">
                            <Edit className="h-4 w-4" />
                            <span>Editor Access</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Link Expiration</Label>
                    <Select 
                      value={linkForm.expiresIn} 
                      onValueChange={(value) => handleLinkInputChange('expiresIn', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never expires</SelectItem>
                        <SelectItem value="7d">7 days</SelectItem>
                        <SelectItem value="30d">30 days</SelectItem>
                        <SelectItem value="90d">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleGenerateLink}
                    disabled={isGeneratingLink}
                    className="w-full"
                  >
                    {isGeneratingLink ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Link...
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Generate Share Link
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Existing Links */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Active Share Links</h4>
                  {isLoadingLinks && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>

                {existingLinks.length === 0 ? (
                  <Card className="p-4 text-center text-gray-500">
                    <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No share links created yet</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {existingLinks.map((link) => (
                      <Card key={link.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge className={getPermissionColor(link.role)}>
                                {getPermissionIcon(link.role)}
                                <span className="ml-1 capitalize">{link.role}</span>
                              </Badge>
                              
                              {isLinkExpired(link.expires_at) && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Expired
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>{formatExpirationDate(link.expires_at)}</span>
                            </div>
                            
                            <div className="text-xs text-gray-400 mt-1 font-mono truncate max-w-[500px]">
                              {`${window.location.origin}/join/${link.share_token}`}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(link.share_token)}
                              disabled={isLinkExpired(link.expires_at)}
                            >
                              {copiedToken === link.share_token ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeLink(link.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Export Project Tab */}
          <TabsContent value="export">
            <div className="space-y-6">
              <Card className="p-4">
                <h3 className="font-medium mb-4">Export Project as ZIP</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Download your project as a ZIP file to back it up or share it offline.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-metadata"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="include-metadata">Include project metadata</Label>
                  </div>

                  {isExporting && (
                    <div className="w-full mb-8">
                      <div className="bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${exportProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 text-right">
                        {exportProgress}% complete
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handleExportProject}
                    disabled={isExporting}
                    className="w-full"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export as ZIP
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;