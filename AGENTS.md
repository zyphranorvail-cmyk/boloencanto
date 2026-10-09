<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- O catálogo estático mantém a personalização e agenda; o checkout local em `public/checkout/index.html` recebe o pedido por sessionStorage e preserva parâmetros de campanha, para reproduzir as etapas do checkout externo sem enviar dados ao gateway antigo.
- A rota pública de PIX valida produto e preço a partir de uma lista fixa no servidor antes de cobrar, para impedir alteração de valor pelo navegador.
- As ofertas opcionais do checkout são identificadas por IDs fixos e precificadas novamente no servidor antes da cobrança, para que seleção e valor não dependam do navegador.
- A medição de anúncios das páginas estáticas é centralizada em `public/ads-consent.js` para não carregar a tag nem enviar eventos sem permissão regional ou após recusa.
- A página estática de obrigado recebe o resultado pelo sessionStorage e dispara a conversão uma vez por pedido após consentimento, para separar a confirmação do checkout sem contar recargas como novas vendas.
- Static content pages must include Lovable's native same-origin analytics script (`/~flock.js` with `data-proxy-url="/~api/analytics"`) exactly once, because direct public HTML responses bypass automatic app-shell injection; do not collect checkout field values in analytics.
