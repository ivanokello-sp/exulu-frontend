export default function N8nPage() {

  const n8n = {
    url: process.env.N8N_URL || "",
  }

  if (!n8n.url) {
    return <div>N8n is not configured</div>
  }

  return (
    <div className="h-screen w-full flex flex-col">
      <iframe
        src={n8n.url}
        className="w-full h-full border-0"
        title="n8n Workflow Automation"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
