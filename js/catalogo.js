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

  // CATÁLOGO COMPLETO - Produtos e Serviços
  const catalog = [
    // Kit Bloguerinha (4 imagens disponíveis)
    { id: 'blog1', category:'Kit Bloguerinha', name:'Kit Bloguerinha 1', price: 2500.00, type: 'produto', image: 'assets/produtos/KitBloguerinha/IMG-20251018-WA0050.jpg' },
    { id: 'blog2', category:'Kit Bloguerinha', name:'Kit Bloguerinha 2', price: 3000.00, type: 'produto', image: 'assets/produtos/KitBloguerinha/IMG-20251018-WA0051.jpg' },
    { id: 'blog3', category:'Kit Bloguerinha', name:'Kit Bloguerinha 3', price: 3500.00, type: 'produto', image: 'assets/produtos/KitBloguerinha/IMG-20251018-WA0053.jpg' },
    { id: 'blog4', category:'Kit Bloguerinha', name:'Kit Bloguerinha 4', price: 5000.00, type: 'produto', image: 'assets/produtos/KitBloguerinha/IMG-20251018-WA0054.jpg' },
    { id: 'blog5', category:'Kit Bloguerinha', name:'Kit Bloguerinha 5', price: 6000.00, type: 'produto', image: 'assets/produtos/KitBloguerinha/IMG-20251018-WA0050.jpg' },
    { id: 'blog6', category:'Kit Bloguerinha', name:'Kit Bloguerinha 6', price: 7000.00, type: 'produto', image: 'assets/produtos/KitBloguerinha/IMG-20251018-WA0051.jpg' },

    // Kits de skincare (4 imagens disponíveis)
    { id: 'skin1', category:'Kits de Skincare', name:'Kit Skincare Premium', price: 13500.00, type: 'produto', image: 'assets/produtos/KitsSkincare/KitSkincare1.jpg' },
    { id: 'skin2', category:'Kits de Skincare', name:'Kit Skincare Completo', price: 16500.00, type: 'produto', image: 'assets/produtos/KitsSkincare/KitSkincare2.jpg' },

    // Canecas (1 imagem disponível)
    { id: 'can1', category:'Canecas', name:'Caneca Mágica Personalizada', price: 5000.00, type: 'produto', image: 'assets/produtos/Canecas/CanecaMágica1.jpg' },
    { id: 'can2', category:'Canecas', name:'Caneca Mágica Premium', price: 10000.00, type: 'produto', image: 'assets/produtos/Canecas/CanecaMágica1.jpg' },

    // Conjunto de cantis (2 imagens disponíveis)
    { id: 'cantis', category:'Cantis', name:'Conjunto de três cantis', price: 8500.00, type: 'produto', image: 'assets/produtos/Cantis/Conjuntode trêscantis1.jpg' },

    // Buquês de flores de cetim
    { id: 'cetim1', category:'Buquês', name:'Buquê de Cetim Clássico', price: 5000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueNatural1.jpg' },
    { id: 'cetim2', category:'Buquês', name:'Buquê de Cetim Elegante', price: 6500.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueNatural2.jpg' },
    { id: 'cetim3', category:'Buquês', name:'Buquê de Cetim Premium', price: 8000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueNatural1.jpg' },
    { id: 'cetim4', category:'Buquês', name:'Buquê de Cetim Luxo', price: 9000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueNatural2.jpg' },

    // Buquês naturais (2 imagens disponíveis)
    { id: 'nat1', category:'Buquês', name:'Buquê Natural Simples', price: 5000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueNatural1.jpg' },
    { id: 'nat2', category:'Buquês', name:'Buquê Natural Médio', price: 7500.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueNatural2.jpg' },
    { id: 'nat3', category:'Buquês', name:'Buquê Natural Grande', price: 9000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueNatural1.jpg' },
    { id: 'nat4', category:'Buquês', name:'Buquê Natural Premium', price: 15000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueNatural2.jpg' },
    { id: 'nat5', category:'Buquês', name:'Buquê Natural Luxo', price: 20000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueNatural1.jpg' },

    // Buquês de doces (2 imagens disponíveis)
    { id: 'doc1', category:'Buquês', name:'Buquê de Doces Pequeno', price: 5000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueDoce1.jpg' },
    { id: 'doc2', category:'Buquês', name:'Buquê de Doces Médio', price: 7500.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueDoce2.jpg' },
    { id: 'doc3', category:'Buquês', name:'Buquê de Doces Grande', price: 9000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueDoce1.jpg' },
    { id: 'doc4', category:'Buquês', name:'Buquê de Doces Premium', price: 10000.00, type: 'servico', image: 'assets/produtos/Serviços/BuqueDoce2.jpg' },

    // Buquês de dinheiro (3 imagens disponíveis)
    { id: 'din20', category:'Buquês', name:'Buquê com 20.000 Kz', price: 7000.00, type: 'servico', image: 'assets/produtos/Serviços/Buquêde20000kz.jpg' },
    { id: 'din50', category:'Buquês', name:'Buquê com 50.000 Kz', price: 12000.00, type: 'servico', image: 'assets/produtos/Serviços/Buquêde50000kz.jpg' },
    { id: 'din100', category:'Buquês', name:'Buquê com 100.000 Kz', price: 25000.00, type: 'servico', image: 'assets/produtos/Serviços/Buquêde30000kz.jpg' },

    // Cestas de pequeno almoço (1 imagem disponível)
    { id: 'cesta1', category:'Cestas', name:'Cesta Pequeno-almoço Luxo', price: 30000.00, type: 'servico', image: 'assets/produtos/Serviços/CestaPequeno-almoço1.jpg' },
    { id: 'cesta2', category:'Cestas', name:'Cesta Pequeno-almoço Premium', price: 25000.00, type: 'servico', image: 'assets/produtos/Serviços/CestaPequeno-almoço1.jpg' },
    { id: 'cesta3', category:'Cestas', name:'Cesta Pequeno-almoço Simples', price: 15000.00, type: 'servico', image: 'assets/produtos/Serviços/CestaPequeno-almoço1.jpg' },

    // Caixas explosivas (1 imagem disponível)
    { id: 'caix1', category:'Caixa Explosiva', name:'Caixa Explosiva Standard', price: 15000.00, type: 'servico', image: 'assets/produtos/Serviços/CaixaExplosiva2.jpg' },
    { id: 'caix2', category:'Caixa Explosiva', name:'Caixa Explosiva Premium', price: 20000.00, type: 'servico', image: 'assets/produtos/Serviços/CaixaExplosiva2.jpg' }
  ];

  const catalogGrid = $('#catalogGrid');
  const cartCountEl = $('#cartCount');
  const cartTotalEl = $('#cartTotal');
  const exportListBtn = $('#exportList');
  const clearCartBtn = $('#clearCart');
  const buyWhatsAppBtn = $('#buyWhatsApp');
  const filterButtons = $$('.filter-btn');

  let currentFilter = 'all';
  let cart = [];

  // Render catálogo
  function renderCatalog(filterCategory = 'all'){
    if(!catalogGrid) return;
    catalogGrid.innerHTML = '';
    
    const filteredItems = filterCategory === 'all' 
      ? catalog 
      : catalog.filter(item => item.category === filterCategory);
    
    filteredItems.forEach(item=>{
      const el = document.createElement('article');
      el.className = 'product-card';
      const typeLabel = item.type === 'produto' ? 'Produto' : 'Serviço';
      el.innerHTML = `
        <div class="product-media">
          <img src="${item.image}" alt="${item.name}">
          <div class="product-type">${typeLabel}</div>
        </div>
        <div class="product-body">
          <h3 class="product-name">${item.name}</h3>
          <p class="product-desc">${item.category}</p>
          <div class="product-footer">
            <div class="price">Kz ${formatKz(item.price)}</div>
            <button class="btn btn-outline btn-sm" data-id="${item.id}">Adicionar</button>
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
    const item = catalog.find(i=>i.id === id);
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
  renderCatalog();
  initFilters();
  bindAddButtons();
  updateCartUI();

})();