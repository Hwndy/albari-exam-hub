import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Download, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  verified: boolean;
  verified_at: string | null;
  uploaded_at: string;
  mime_type: string | null;
}

interface AdmissionDocumentViewerProps {
  applicationId: string;
}

export const AdmissionDocumentViewer = ({ applicationId }: AdmissionDocumentViewerProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingDoc, setVerifyingDoc] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchDocuments();
  }, [applicationId]);

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_application_documents", {
        p_application_id: applicationId,
      });

      if (error) {
        console.error("Error fetching documents:", error);
        toast.error(error.message || "Failed to load documents");
        setDocuments([]);
      } else {
        setDocuments(((data as unknown) as Document[]) || []);
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (docId: string, verified: boolean) => {
    setVerifyingDoc(docId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("admission_documents")
        .update({
          verified,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", docId);

      if (error) throw error;

      toast.success(`Document ${verified ? "verified" : "rejected"} successfully`);
      fetchDocuments();
    } catch (error: any) {
      toast.error("Failed to update document: " + error.message);
    } finally {
      setVerifyingDoc(null);
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("admission-documents")
        .download(fileUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Failed to download document: " + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No documents uploaded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {doc.document_type}
                </CardTitle>
                <CardDescription>{doc.document_name}</CardDescription>
              </div>
              {doc.verified ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(doc.file_url, doc.document_name)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {!doc.verified && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleVerify(doc.id, true)}
                    disabled={verifyingDoc === doc.id}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleVerify(doc.id, false)}
                    disabled={verifyingDoc === doc.id}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
              {doc.verified_at && ` • Verified: ${new Date(doc.verified_at).toLocaleDateString()}`}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
