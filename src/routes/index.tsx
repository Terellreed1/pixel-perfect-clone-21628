import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aaron Hampton" },
      { name: "description", content: "Director & Cinematographer based in Waldorf." },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/Aaron_Hampton.html");
  }, []);
  return null;
}
