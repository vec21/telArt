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
  const cartCountEl = $('#cartCount');
  const cartTotalEl = $('#cartTotal');
  const exportListBtn = $('#exportList');
  const clearCartBtn = $('#clearCart');
  const buyWhatsAppBtn = $('#buyWhatsApp');
  const filterButtons = $$('.filter-btn');

  let currentFilter = 'all';
  let cart = [];

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
      .select('id, nome, slug, categoria, preco_kz, descricao, imagem_url, ordem, destaque')
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
      price: Number(p.preco_kz) || 0,
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

  // Carrinho
  function updateCartUI(){
    if(!cartCountEl || !cartTotalEl) return;
    cartCountEl.textContent = String(cart.length);
    const total = cart.reduce((s,i)=> s + Number(i.price || 0), 0);
    cartTotalEl.textContent = formatKz(total);
    
    // atualizar link WhatsApp com resumo
    const phone = '244923862830';
    if(cart.length){
      const lines = cart.map((it, idx)=> `${idx+1}. ${it.name} - Kz ${formatKz(it.price)}`).join('\n');
      const tot = formatKz(total);
      const message = `Olá Tel'Art! Gostaria de encomendar:

${lines}

Total: Kz ${tot}

"O toque mágico para não espumar" ✨

Obrigado!`;
      
      const text = encodeURIComponent(message);
      if(buyWhatsAppBtn) buyWhatsAppBtn.href = `https://wa.me/${phone}?text=${text}`;
    } else {
      if(buyWhatsAppBtn) buyWhatsAppBtn.href = `https://wa.me/${phone}`;
    }
  }

  // Eventos: adicionar ao carrinho
  function bindAddButtons(){
    if(!catalogGrid) return;
    // Remover listeners anteriores
    catalogGrid.removeEventListener('click', handleAddClick);
    catalogGrid.addEventListener('click', handleAddClick);
  }

  function handleAddClick(ev){
    const btn = ev.target.closest('button[data-id]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const item = catalog.find(i=> String(i.id) === String(id));
    if(!item) return;
    
    cart.push(item);
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '✓ Adicionado';
    setTimeout(()=>{ 
      btn.innerHTML = original; 
      btn.disabled = false; 
    }, 900);
    updateCartUI();
  }

  // Limpar carrinho
  clearCartBtn && clearCartBtn.addEventListener('click', ()=>{
    cart = [];
    updateCartUI();
  });

  // Exportar lista
  exportListBtn && exportListBtn.addEventListener('click', ()=>{
    const win = window.open('', '_blank');
    const listHtml = cart.length 
      ? cart.map((it, idx)=> `<tr><td>${idx+1}</td><td>${it.name}</td><td>${it.category}</td><td>Kz ${formatKz(it.price)}</td></tr>`).join('') 
      : '<tr><td colspan="4">Nenhum item selecionado</td></tr>';
    const total = formatKz(cart.reduce((s,i)=> s + Number(i.price || 0), 0));
    
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
        <thead><tr><th>#</th><th>Produto/Serviço</th><th>Categoria</th><th>Preço</th></tr></thead>
        <tbody>${listHtml}</tbody>
        <tfoot><tr class="total-row"><td colspan="3"><strong>Total da Encomenda</strong></td><td><strong>Kz ${total}</strong></td></tr></tfoot>
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