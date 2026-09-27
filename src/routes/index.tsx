import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cardápio Online | Bolos Encanto" },
      {
        name: "description",
        content:
          "Bolos de aniversário feitos no dia. Peça agora ou agende a entrega.",
      },
      { property: "og:title", content: "Cardápio Online | Bolos Encanto" },
      {
        property: "og:description",
        content:
          "Bolos de aniversário feitos no dia. Peça agora ou agende a entrega.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ href: "/cardapio/index.html" });
  },
  component: () => null,
});
