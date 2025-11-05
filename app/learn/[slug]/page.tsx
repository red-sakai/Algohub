import BackgroundDoodles from "../../components/sections/BackgroundDoodles";

export default function LearnPage() {
  // For now, we only render the animated background. Content will come later.
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-sky-500 to-green-300 text-white">
      <BackgroundDoodles />
    </main>
  );
}
