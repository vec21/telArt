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

  // Exportar lista
  exportListBtn && exportListBtn.addEventListener('click', ()=>{
    const lines = cartLines();
    const win = window.open('', '_blank');
    const listHtml = lines.length
      ? lines.map(({item, qty}, idx)=> `<tr><td>${idx+1}</td><td>${esc(item.name)}</td><td>${esc(item.category)}</td><td>${qty}</td><td>Kz ${formatKz(Number(item.price) * qty)}</td></tr>`).join('')
      : '<tr><td colspan="5">Nenhum item selecionado</td></tr>';
    const total = formatKz(cartTotal());

    win.document.write(`
      <html><head><title>Encomenda Tel'Art</title>
      <style>
        body{font-family:Inter,Arial;padding:20px;color:#111;max-width:800px;margin:0 auto}
        .header{text-align:center;margin-bottom:2rem;border-bottom:2px solid #F45B5B;padding-bottom:1rem}
        .slogan{color:#F45B5B;font-style:italic;margin:0.5rem 0}
        table{width:100%;border-collapse:collapse;margin:1rem 0}
        td,th{padding:8px 12px;border:1px solid #ddd;text-align:left}
        th{background:#F45B5B;color:white}
        .total-row{background:#f9f9f9;font-weight:bold}
        .footer{margin-top:2rem;text-align:center;color:#666;font-size:0.9rem}
        @media print{button{display:none}}
      </style>
      </head><body>
      <div class="header">
        <h1>Tel'Art - Encomenda</h1>
        <p class="slogan">"O toque mágico para não espumar"</p>
        <p>Fundada por Adriana • 14 de Janeiro 2024 • Angola</p>
      </div>
      <table>
        <thead><tr><th>#</th><th>Produto/Serviço</th><th>Categoria</th><th>Qtd</th><th>Subtotal</th></tr></thead>
        <tbody>${listHtml}</tbody>
        <tfoot><tr class="total-row"><td colspan="4"><strong>Total da Encomenda</strong></td><td><strong>Kz ${total}</strong></td></tr></tfoot>
      </table>
      <div class="footer">
        <p>Gerado em ${new Date().toLocaleString('pt-AO')}</p>
        <p><strong>WhatsApp:</strong> +244 923 862 830 • <strong>E-mail:</strong> contato@telart.ao</p>
        <button onclick="window.print()" style="padding:10px 20px;background:#F45B5B;color:white;border:none;border-radius:5px;margin-top:1rem">Imprimir / Salvar PDF</button>
      </div></body></html>
    `);
    win.document.close();
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