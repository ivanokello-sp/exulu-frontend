export default function TranscriptionsPage() {

  return (
    <div className="h-screen w-full flex flex-col">
      <iframe
        src={"http://kanton-zurich-transcribozh-qra9zy-6ce458-144-76-102-69.traefik.me:8080/"}
        className="w-full h-full border-0"
        title="TranscriboZH"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
