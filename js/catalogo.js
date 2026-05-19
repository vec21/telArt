// js/catalogo.js - Tel'Art Catálogo Completo (carrinho in-memory, filtros, export, WhatsApp)
(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // Util: formata número em Kz (ex: 2500 -> "2.500,00")
  function formatKz(v){
    if(isNaN(v)) return v;
    const num = Number(v);
    const int = Math.floor(num).toString();
    const withThousands = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const decimals = Math.round((num - Math.floor(num)) * 100).toString().padStart(2,'0');
    return withThousands + ',' + decimals;
  }

  // Labels legíveis por slug de categoria (alinhado com SPEC §5.4)
  const CATEGORIA_LABELS = {
    kit_bloguerinha: 'Kit Bloguerinha',
    kit_skincare: 'Kit Skincare',
    buque: 'Buquê',
    cesta: 'Cesta',
    caneca: 'Caneca',
    cantil: 'Cantil',
    caixa_explosiva: 'Caixa Explosiva',
    outro: 'Outro'
  };

  // Catálogo carregado dinamicamente do Supabase. Ref: SPEC §6.4, AC23
  let catalog = [];

  const catalogGrid = $('#catalogGrid');
  const filterButtons = $$('.filter-btn');

  // Cart drawer refs (v2.1.3 — Ref SPEC §12 Change Control v2.1.3)
  const cartTrigger = $('#cartTrigger');
  const cartBadge = $('#cartBadge');
  const cartDrawer = $('#cartDrawer');
  const cartBackdrop = $('#cartBackdrop');
  const cartDrawerClose = $('#cartDrawerClose');
  const cartDrawerBody = $('#cartDrawerBody');
  const cartDrawerTotal = $('#cartDrawerTotal');
  const buyWhatsAppBtn = $('#buyWhatsAppDrawer');
  const exportListBtn = $('#exportListDrawer');
  const clearCartBtn = $('#clearCartDrawer');
  const toastStack = $('#toastStack');

  let currentFilter = 'all';
  // cart: Map<id, { item, qty }>
  const cart = new Map();

  // ---- Toast ----
  function showToast(msg, variant){
    if(!toastStack) return;
    const t = document.createElement('div');
    t.className = 'toast toast-' + (variant || 'success');
    t.textContent = msg;
    toastStack.appendChild(t);
    requestAnimationFrame(()=> t.classList.add('is-visible'));
    setTimeout(()=>{
      t.classList.remove('is-visible');
      setTimeout(()=> t.remove(), 250);
    }, 1800);
  }

  // ---- Drawer open/close ----
  function openDrawer(){
    if(!cartDrawer) return;
    cartDrawer.setAttribute('aria-hidden','false');
    cartBackdrop && cartBackdrop.setAttribute('aria-hidden','false');
    cartTrigger && cartTrigger.setAttribute('aria-expanded','true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer(){
    if(!cartDrawer) return;
    cartDrawer.setAttribute('aria-hidden','true');
    cartBackdrop && cartBackdrop.setAttribute('aria-hidden','true');
    cartTrigger && cartTrigger.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
  }

  // Escape básico para evitar HTML injection a partir de campos do CMS
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  // Carrega produtos activos do Supabase. Ref: SPEC §6.4, AC23
  async function loadCatalog(){
    const client = window.supabaseClient;
    if(!client){
      console.error('[catalogo] Supabase client indisponível.');
      if(catalogGrid) catalogGrid.innerHTML = '<p class="catalog-empty">Não foi possível carregar o catálogo.</p>';
      return;
    }
    if(catalogGrid) catalogGrid.innerHTML = '<p class="catalog-loading">A carregar catálogo...</p>';
    const { data, error } = await client
      .from('produtos')
      .select('id, nome, slug, categoria, preco, descricao, imagem_url, ordem, destaque')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false });
    if(error){
      console.error('[catalogo] Erro ao carregar produtos:', error);
      if(catalogGrid) catalogGrid.innerHTML = '<p class="catalog-empty">Não foi possível carregar o catálogo.</p>';
      return;
    }
    catalog = (data || []).map(p => ({
      id: p.id,
      slug: p.slug,
      categoria: p.categoria,
      category: CATEGORIA_LABELS[p.categoria] || p.categoria || 'Outro',
      name: p.nome,
      price: Number(p.preco) || 0,
      description: p.descricao || '',
      image: p.imagem_url || 'assets/logo.png',
      destaque: !!p.destaque
    }));
  }

  // Render catálogo
  function renderCatalog(filterCategory = 'all'){
    if(!catalogGrid) return;
    catalogGrid.innerHTML = '';

    const filteredItems = filterCategory === 'all'
      ? catalog
      : catalog.filter(item => item.categoria === filterCategory);

    if(!filteredItems.length){
      catalogGrid.innerHTML = '<p class="catalog-empty">Sem produtos nesta categoria.</p>';
      return;
    }

    filteredItems.forEach(item=>{
      const el = document.createElement('article');
      el.className = 'product-card';
      const badge = item.destaque ? '<div class="product-type">Destaque</div>' : '';
      el.innerHTML = `
        <div class="product-media">
          <img src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy">
          ${badge}
        </div>
        <div class="product-body">
          <h3 class="product-name">${esc(item.name)}</h3>
          <p class="product-desc">${esc(item.category)}</p>
          <div class="product-footer">
            <div class="price">Kz ${formatKz(item.price)}</div>
            <button class="btn btn-outline btn-sm" data-id="${esc(item.id)}">Adicionar</button>
          </div>
        </div>
      `;
      catalogGrid.appendChild(el);
    });

    // Atualizar contador
    const countEl = document.createElement('div');
    countEl.className = 'catalog-count';
    countEl.textContent = `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''} encontrado${filteredItems.length !== 1 ? 's' : ''}`;
    catalogGrid.parentNode.insertBefore(countEl, catalogGrid);
  }

  // Filtros
  function initFilters(){
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remover active de todos os botões
        filterButtons.forEach(b => b.classList.remove('active'));
        // Adicionar active ao botão clicado
        e.target.classList.add('active');
        
        const category = e.target.getAttribute('data-category');
        currentFilter = category;
        
        // Remover contador anterior
        const existingCount = document.querySelector('.catalog-count');
        if(existingCount) existingCount.remove();
        
        renderCatalog(category);
        bindAddButtons();
      });
    });
  }

  // ---- Cart state helpers ----
  function cartCount(){
    let n = 0; cart.forEach(v => n += v.qty); return n;
  }
  function cartTotal(){
    let t = 0; cart.forEach(v => t += Number(v.item.price || 0) * v.qty); return t;
  }
  function cartLines(){
    const arr = [];
    cart.forEach(({item, qty}) => arr.push({item, qty}));
    return arr;
  }

  function renderDrawer(){
    if(!cartDrawerBody) return;
    const lines = cartLines();
    if(!lines.length){
      cartDrawerBody.innerHTML = `
        <div class="cart-empty-state">
          <span class="cart-empty-icon" aria-hidden="true">🧺</span>
          <p>O seu carrinho está vazio.</p>
          <p style="font-size:.85rem;opacity:.8">Adicione produtos do catálogo para começar.</p>
        </div>`;
    } else {
      cartDrawerBody.innerHTML = lines.map(({item, qty}) => `
        <div class="cart-item" data-id="${esc(item.id)}">
          <img class="cart-item-img" src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy">
          <div class="cart-item-info">
            <p class="cart-item-name">${esc(item.name)}</p>
            <p class="cart-item-cat">${esc(item.category)}</p>
            <div class="cart-item-price">Kz ${formatKz(Number(item.price) * qty)}</div>
            <button class="cart-item-remove" type="button" data-action="remove" data-id="${esc(item.id)}">Remover</button>
          </div>
          <div class="cart-qty" role="group" aria-label="Quantidade">
            <button type="button" data-action="dec" data-id="${esc(item.id)}" aria-label="Diminuir">−</button>
            <span class="cart-qty-val">${qty}</span>
            <button type="button" data-action="inc" data-id="${esc(item.id)}" aria-label="Aumentar">+</button>
          </div>
        </div>
      `).join('');
    }
  }

  function updateCartUI(){
    const n = cartCount();
    const t = cartTotal();
    if(cartBadge){
      cartBadge.textContent = String(n);
      cartBadge.setAttribute('data-empty', n === 0 ? 'true' : 'false');
    }
    if(cartDrawerTotal) cartDrawerTotal.textContent = formatKz(t);

    // WhatsApp link
    const phone = '244923862830';
    if(buyWhatsAppBtn){
      if(n > 0){
        const lines = cartLines().map(({item, qty}, idx) =>
          `${idx+1}. ${item.name} (x${qty}) - Kz ${formatKz(Number(item.price) * qty)}`
        ).join('\n');
        const msg = `Olá Tel'Art! Gostaria de encomendar:\n\n${lines}\n\nTotal: Kz ${formatKz(t)}\n\n"O toque mágico para não espumar" ✨\n\nObrigado!`;
        buyWhatsAppBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      } else {
        buyWhatsAppBtn.href = `https://wa.me/${phone}`;
      }
    }
    renderDrawer();
  }

  // ---- Add / qty handlers ----
  function bindAddButtons(){
    if(!catalogGrid) return;
    catalogGrid.removeEventListener('click', handleAddClick);
    catalogGrid.addEventListener('click', handleAddClick);
  }

  function handleAddClick(ev){
    const btn = ev.target.closest('button[data-id]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const item = catalog.find(i => String(i.id) === String(id));
    if(!item) return;

    const entry = cart.get(id);
    if(entry){ entry.qty += 1; }
    else { cart.set(id, { item, qty: 1 }); }

    btn.setAttribute('data-added', 'true');
    const original = btn.innerHTML;
    btn.innerHTML = '✓ Adicionado';
    setTimeout(()=>{
      btn.innerHTML = original;
      btn.removeAttribute('data-added');
    }, 900);

    showToast(`${item.name} adicionado ao carrinho`, 'success');
    updateCartUI();
  }

  // Drawer item interactions (+/−/remove)
  cartDrawerBody && cartDrawerBody.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    const entry = cart.get(id);
    if(!entry) return;
    if(action === 'inc') entry.qty += 1;
    else if(action === 'dec'){
      entry.qty -= 1;
      if(entry.qty <= 0) cart.delete(id);
    } else if(action === 'remove'){
      cart.delete(id);
      showToast(`${entry.item.name} removido`, 'info');
    }
    updateCartUI();
  });

  // Drawer open/close bindings
  cartTrigger && cartTrigger.addEventListener('click', openDrawer);
  cartDrawerClose && cartDrawerClose.addEventListener('click', closeDrawer);
  cartBackdrop && cartBackdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && cartDrawer && cartDrawer.getAttribute('aria-hidden') === 'false') closeDrawer();
  });

  // Limpar carrinho
  clearCartBtn && clearCartBtn.addEventListener('click', ()=>{
    if(!cart.size) return;
    cart.clear();
    updateCartUI();
    showToast('Carrinho limpo', 'info');
  });

  // Gerar Proforma (PDF via window.print)
  exportListBtn && exportListBtn.addEventListener('click', ()=>{
    const lines = cartLines();
    if(!lines.length){
      showToast('Adicione produtos antes de gerar a proforma', 'info');
      return;
    }

    // Dados do cliente (opcionais)
    const clienteNome = (prompt('Nome do cliente (opcional):', '') || '').trim();
    const clienteContacto = (prompt('Contacto do cliente — WhatsApp ou e-mail (opcional):', '') || '').trim();

    // Numeração sequencial persistida em localStorage
    const KEY = 'telart_proforma_seq';
    const seq = (parseInt(localStorage.getItem(KEY) || '0', 10) + 1);
    localStorage.setItem(KEY, String(seq));
    const ano = new Date().getFullYear();
    const numero = `PRO ${ano}/${String(seq).padStart(4, '0')}`;

    const subtotal = cartTotal();
    const dataEmissao = new Date().toLocaleDateString('pt-AO', { day:'2-digit', month:'long', year:'numeric' });
    const validade = new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString('pt-AO', { day:'2-digit', month:'long', year:'numeric' });

    const itensHtml = lines.map(({item, qty}, idx) => {
      const sub = Number(item.price) * qty;
      return `<tr>
        <td>${idx+1}</td>
        <td><div class="prod">${esc(item.name)}</div><div class="cat">${esc(item.category)}</div></td>
        <td class="num">${qty}</td>
        <td class="num">Kz ${formatKz(Number(item.price))}</td>
        <td class="num">Kz ${formatKz(sub)}</td>
      </tr>`;
    }).join('');

    const win = window.open('', '_blank');
    win.document.write(`<!doctype html>
<html lang="pt-AO"><head>
<meta charset="utf-8">
<title>Proforma ${esc(numero)} — Tel'Art</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  body{font-family:'Inter',Arial,sans-serif;color:#2a1a1a;background:#fbf4ec;margin:0;padding:32px}
  .sheet{max-width:780px;margin:0 auto;background:#fff8ed;padding:40px 44px;border:1px solid rgba(42,26,26,.1);box-shadow:8px 8px 0 rgba(42,26,26,.06)}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(42,26,26,.15);padding-bottom:18px;margin-bottom:24px}
  .brand h1{font-family:'Playfair Display',Georgia,serif;font-size:1.9rem;margin:0;letter-spacing:-.01em}
  .brand .tag{font-family:'Playfair Display',Georgia,serif;font-style:italic;color:#7a5c5c;font-size:.9rem;margin-top:4px}
  .doc{text-align:right}
  .doc .label{font-size:.65rem;letter-spacing:.22em;text-transform:uppercase;color:#c94b6b;font-weight:700}
  .doc .num{font-family:'Playfair Display',Georgia,serif;font-size:1.4rem;font-weight:700;margin-top:2px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;font-size:.85rem}
  .meta h3{font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;color:#7a5c5c;margin:0 0 6px;font-weight:600}
  .meta .val{color:#2a1a1a}
  table{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:.88rem}
  thead th{background:#2a1a1a;color:#fff8ed;text-align:left;padding:10px 12px;font-size:.66rem;letter-spacing:.18em;text-transform:uppercase;font-weight:600}
  thead th.num,tbody td.num{text-align:right}
  tbody td{padding:12px;border-bottom:1px dashed rgba(42,26,26,.12);vertical-align:top}
  tbody .prod{font-family:'Playfair Display',Georgia,serif;font-size:1rem;font-weight:600}
  tbody .cat{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:#9a7c7c;margin-top:2px}
  .totals{margin-top:8px;display:flex;justify-content:flex-end}
  .totals table{width:auto;min-width:280px}
  .totals td{padding:6px 12px;border:none}
  .totals .lab{color:#7a5c5c;font-size:.78rem}
  .totals .val{font-family:'Playfair Display',Georgia,serif;font-weight:600;text-align:right}
  .totals .grand .lab{font-size:.66rem;letter-spacing:.22em;text-transform:uppercase;color:#c94b6b;font-weight:700;border-top:1px solid rgba(42,26,26,.2);padding-top:10px}
  .totals .grand .val{font-size:1.4rem;border-top:1px solid rgba(42,26,26,.2);padding-top:10px;color:#2a1a1a}
  .notes{margin-top:24px;padding-top:18px;border-top:1px dashed rgba(42,26,26,.15);font-size:.78rem;color:#5a4242;line-height:1.55}
  .notes strong{font-family:'Playfair Display',Georgia,serif;font-weight:600;display:block;margin-bottom:4px;color:#2a1a1a}
  .foot{margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid rgba(42,26,26,.15);padding-top:16px;font-size:.78rem;color:#7a5c5c}
  .foot .sig{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:1rem;color:#c94b6b}
  .actions{max-width:780px;margin:18px auto 0;display:flex;justify-content:flex-end;gap:10px}
  .actions button{font-family:'Inter',sans-serif;font-size:.74rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:.7rem 1.1rem;border:1px solid #2a1a1a;background:#2a1a1a;color:#fff8ed;cursor:pointer}
  .actions button.alt{background:transparent;color:#2a1a1a}
  @media print{
    body{background:#fff;padding:0}
    .sheet{box-shadow:none;border:none;background:#fff;max-width:none;padding:24px 28px}
    .actions{display:none}
    a{color:inherit;text-decoration:none}
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        <h1>Tel'Art</h1>
        <div class="tag">O toque mágico para não espumar</div>
      </div>
      <div class="doc">
        <div class="label">Proforma</div>
        <div class="num">${esc(numero)}</div>
      </div>
    </div>

    <div class="meta">
      <div>
        <h3>Emitido por</h3>
        <div class="val"><strong>Tel'Art</strong></div>
        <div class="val">Luanda, Angola</div>
        <div class="val">WhatsApp: +244 923 862 830</div>
        <div class="val">contato@telart.ao</div>
      </div>
      <div>
        <h3>Cliente</h3>
        <div class="val"><strong>${esc(clienteNome || '—')}</strong></div>
        <div class="val">${esc(clienteContacto || '—')}</div>
        <h3 style="margin-top:14px">Datas</h3>
        <div class="val">Emissão: ${esc(dataEmissao)}</div>
        <div class="val">Válido até: ${esc(validade)}</div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th style="width:34px">#</th>
        <th>Produto / Serviço</th>
        <th class="num" style="width:60px">Qtd</th>
        <th class="num" style="width:130px">Preço unit.</th>
        <th class="num" style="width:140px">Subtotal</th>
      </tr></thead>
      <tbody>${itensHtml}</tbody>
    </table>

    <div class="totals">
      <table>
        <tr><td class="lab">Subtotal</td><td class="val">Kz ${formatKz(subtotal)}</td></tr>
        <tr class="grand"><td class="lab">Total</td><td class="val">Kz ${formatKz(subtotal)}</td></tr>
      </table>
    </div>

    <div class="notes">
      <strong>Notas</strong>
      Esta proforma é um documento de orçamento — não substitui factura fiscal. Valores em Kwanzas (AOA). Validade: 7 dias. Para confirmar a encomenda, contacte-nos pelo WhatsApp +244 923 862 830.
    </div>

    <div class="foot">
      <div>Documento gerado em ${esc(new Date().toLocaleString('pt-AO'))}</div>
      <div class="sig">Tel'Art • feito à mão</div>
    </div>
  </div>

  <div class="actions">
    <button class="alt" onclick="window.close()">Fechar</button>
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>
</body></html>`);
    win.document.close();
    showToast(`Proforma ${numero} gerada`, 'success');
  });

  // Inicialização
  (async function init(){
    await loadCatalog();
    renderCatalog(currentFilter);
    initFilters();
    bindAddButtons();
    updateCartUI();
  })();

})();