// admin.js — Painel administrativo Tel'Art (SPEC §2.0)
// Stack: vanilla JS + supabase-js (carregado via CDN no admin.html)

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ===== Config =====
  const PAGE_SIZE = 25;
  const PRODUTOS_PAGE_SIZE = 24;
  const WHATSAPP_BASE = 'https://wa.me/';
  const STORAGE_BUCKET = 'produtos';

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

  // ===== State =====
  const state = {
    user: null,
    tab: 'mensagens',
    mensagens: { items: [], page: 0, total: 0, status: '', search: '' },
    newsletter: { items: [], page: 0, total: 0, search: '' },
    produtos: { items: [], page: 0, total: 0, categoria: '', ativo: '', search: '' },
    currentMessage: null,
    currentProduto: null
  };

  let client = null;
  let searchDebounceTimer = null;

  // ===== Helpers =====
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function downloadCSV(filename, rows) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ===== Auth =====
  async function checkSession() {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) return null;
    return data.session.user;
  }

  function showLogin() {
    $('#loginSection').hidden = false;
    $('#dashboardSection').hidden = true;
  }

  function showDashboard(user) {
    $('#loginSection').hidden = true;
    $('#dashboardSection').hidden = false;
    $('#userEmail').textContent = user.email || '';
  }

  async function handleLogin(ev) {
    ev.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    const status = $('#loginStatus');
    const btn = $('#loginBtn');

    status.textContent = '';
    btn.disabled = true;
    status.textContent = 'A entrar...';
    status.style.color = '#7a5c5c';

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        status.textContent = 'Credenciais inválidas.';
        status.style.color = '#dc2626';
      } else {
        state.user = data.user;
        showDashboard(data.user);
        await loadAll();
      }
    } catch (_e) {
      status.textContent = 'Erro de ligação. Tente novamente.';
      status.style.color = '#dc2626';
    } finally {
      btn.disabled = false;
    }
  }

  async function handleLogout() {
    await client.auth.signOut();
    state.user = null;
    state.mensagens = { items: [], page: 0, total: 0, status: '', search: '' };
    state.newsletter = { items: [], page: 0, total: 0, search: '' };
    $('#loginEmail').value = '';
    $('#loginPassword').value = '';
    showLogin();
  }

  // ===== Tabs =====
  function activateTab(tabName) {
    state.tab = tabName;
    $$('.admin-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
    $$('.admin-panel').forEach((p) => {
      const id = p.id.replace('panel', '').toLowerCase();
      p.hidden = id !== tabName;
      p.classList.toggle('active', id === tabName);
    });
  }

  // ===== Mensagens =====
  async function loadMensagens() {
    const m = state.mensagens;
    const tbody = $('#tableMensagens tbody');
    const loading = $('#loadingMensagens');
    const empty = $('#emptyMensagens');

    loading.hidden = false;
    empty.hidden = true;
    tbody.innerHTML = '';

    let q = client
      .from('formulario')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(m.page * PAGE_SIZE, m.page * PAGE_SIZE + PAGE_SIZE - 1);

    if (m.status) q = q.eq('status', m.status);
    if (m.search) {
      const s = m.search.replace(/%/g, '');
      q = q.or(`nome.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data, error, count } = await q;
    loading.hidden = true;

    if (error) {
      empty.hidden = false;
      empty.textContent = 'Erro ao carregar mensagens.';
      return;
    }

    m.items = data || [];
    m.total = count || 0;

    if (!m.items.length) {
      empty.hidden = false;
      empty.textContent = 'Sem mensagens.';
    } else {
      tbody.innerHTML = m.items.map(renderMessageRow).join('');
      tbody.querySelectorAll('tr[data-id]').forEach((tr) => {
        tr.addEventListener('click', () => openMessageModal(tr.dataset.id));
      });
    }

    updatePagination('mensagens');
    updateBadgeNovas();
  }

  function renderMessageRow(r) {
    return `
      <tr data-id="${r.id}">
        <td class="col-date">${escapeHtml(fmtDate(r.created_at))}</td>
        <td>${escapeHtml(r.nome)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td>${escapeHtml(r.telefone || '—')}</td>
        <td>${escapeHtml(r.assunto)}</td>
        <td class="col-msg" title="${escapeHtml(r.mensagem)}">${escapeHtml(r.mensagem)}</td>
        <td><span class="status-pill status-${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
      </tr>`;
  }

  async function updateBadgeNovas() {
    const { count } = await client
      .from('formulario')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'novo');
    $('#tabMensagensCount').textContent = count ? String(count) : '';
  }

  // ===== Modal =====
  function openMessageModal(id) {
    const msg = state.mensagens.items.find((m) => m.id === id);
    if (!msg) return;
    state.currentMessage = msg;
    const body = $('#messageModalBody');
    const phone = (msg.telefone || '').replace(/\D/g, '');
    const subj = encodeURIComponent(`Re: ${msg.assunto} — Tel'Art`);
    const bodyText = encodeURIComponent(`Olá ${msg.nome},\n\n`);

    body.innerHTML = `
      <dt>Data</dt><dd>${escapeHtml(fmtDate(msg.created_at))}</dd>
      <dt>Nome</dt><dd>${escapeHtml(msg.nome)}</dd>
      <dt>Email</dt><dd>${escapeHtml(msg.email)}</dd>
      <dt>Telefone</dt><dd>${escapeHtml(msg.telefone || '—')}</dd>
      <dt>Assunto</dt><dd>${escapeHtml(msg.assunto)}</dd>
      <dt>Mensagem</dt>
      <dd class="msg-body">${escapeHtml(msg.mensagem)}</dd>
    `;

    $('#modalStatus').value = msg.status;
    $('#modalReplyEmail').href = `mailto:${msg.email}?subject=${subj}&body=${bodyText}`;
    const wa = $('#modalReplyWhatsapp');
    if (phone) {
      wa.hidden = false;
      wa.href = `${WHATSAPP_BASE}${phone}`;
    } else {
      wa.hidden = true;
    }

    $('#messageModal').hidden = false;
  }

  function closeMessageModal() {
    $('#messageModal').hidden = true;
    state.currentMessage = null;
  }

  async function handleStatusChange(ev) {
    const newStatus = ev.target.value;
    const msg = state.currentMessage;
    if (!msg) return;
    const { error } = await client
      .from('formulario')
      .update({ status: newStatus })
      .eq('id', msg.id);
    if (!error) {
      msg.status = newStatus;
      await loadMensagens();
    }
  }

  async function exportMensagens() {
    // Exporta TODAS as mensagens (até 5000) — sem paginação
    const { data, error } = await client
      .from('formulario')
      .select('created_at,nome,email,telefone,assunto,mensagem,status')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error || !data) return;
    const rows = data.map((r) => ({
      data: fmtDate(r.created_at),
      nome: r.nome,
      email: r.email,
      telefone: r.telefone || '',
      assunto: r.assunto,
      mensagem: r.mensagem,
      estado: r.status
    }));
    downloadCSV(`mensagens-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  // ===== Newsletter =====
  async function loadNewsletter() {
    const n = state.newsletter;
    const tbody = $('#tableNewsletter tbody');
    const loading = $('#loadingNewsletter');
    const empty = $('#emptyNewsletter');

    loading.hidden = false;
    empty.hidden = true;
    tbody.innerHTML = '';

    let q = client
      .from('newsletter')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(n.page * PAGE_SIZE, n.page * PAGE_SIZE + PAGE_SIZE - 1);

    if (n.search) {
      const s = n.search.replace(/%/g, '');
      q = q.ilike('email', `%${s}%`);
    }

    const { data, error, count } = await q;
    loading.hidden = true;

    if (error) {
      empty.hidden = false;
      empty.textContent = 'Erro ao carregar subscritores.';
      return;
    }

    n.items = data || [];
    n.total = count || 0;

    if (!n.items.length) {
      empty.hidden = false;
      empty.textContent = 'Sem subscritores.';
    } else {
      tbody.innerHTML = n.items.map((r) => `
        <tr>
          <td class="col-date">${escapeHtml(fmtDate(r.created_at))}</td>
          <td>${escapeHtml(r.email)}</td>
        </tr>
      `).join('');
    }

    $('#tabNewsletterCount').textContent = n.total ? String(n.total) : '';
    updatePagination('newsletter');
  }

  async function exportNewsletter() {
    const { data, error } = await client
      .from('newsletter')
      .select('created_at,email')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error || !data) return;
    const rows = data.map((r) => ({
      data: fmtDate(r.created_at),
      email: r.email
    }));
    downloadCSV(`newsletter-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  // ===== Produtos =====
  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function formatKz(v) {
    if (v == null || v === '') return null;
    const num = Number(v);
    if (isNaN(num)) return null;
    return num.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function loadProdutos() {
    const p = state.produtos;
    const grid = $('#produtosGrid');
    const loading = $('#loadingProdutos');
    const empty = $('#emptyProdutos');

    loading.hidden = false;
    empty.hidden = true;
    grid.innerHTML = '';

    let q = client
      .from('produtos')
      .select('*', { count: 'exact' })
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false })
      .range(p.page * PRODUTOS_PAGE_SIZE, p.page * PRODUTOS_PAGE_SIZE + PRODUTOS_PAGE_SIZE - 1);

    if (p.categoria) q = q.eq('categoria', p.categoria);
    if (p.ativo === 'true') q = q.eq('ativo', true);
    if (p.ativo === 'false') q = q.eq('ativo', false);
    if (p.search) {
      const s = p.search.replace(/%/g, '');
      q = q.ilike('nome', `%${s}%`);
    }

    const { data, error, count } = await q;
    loading.hidden = true;

    if (error) {
      empty.hidden = false;
      empty.textContent = 'Erro ao carregar produtos.';
      return;
    }

    p.items = data || [];
    p.total = count || 0;

    if (!p.items.length) {
      empty.hidden = false;
      empty.textContent = 'Sem produtos.';
    } else {
      grid.innerHTML = p.items.map(renderProdutoCard).join('');
      grid.querySelectorAll('[data-prod-id]').forEach((el) => {
        el.addEventListener('click', () => openProductModal(el.dataset.prodId));
      });
    }

    $('#tabProdutosCount').textContent = p.total ? String(p.total) : '';
    updatePagination('produtos');
  }

  function renderProdutoCard(r) {
    const preco = formatKz(r.preco);
    const precoHtml = preco
      ? `<div class="produto-preco">Kz ${preco}</div>`
      : `<div class="produto-preco sob-consulta">Sob consulta</div>`;
    const img = r.imagem_url
      ? `<img src="${escapeHtml(r.imagem_url)}" alt="${escapeHtml(r.nome)}" loading="lazy" />`
      : `<span class="no-img">Sem imagem</span>`;
    const flags = [];
    if (r.destaque) flags.push('<span class="produto-flag flag-destaque">Destaque</span>');
    if (!r.ativo) flags.push('<span class="produto-flag flag-inactivo">Inactivo</span>');
    const flagsHtml = flags.length ? `<div class="produto-flags">${flags.join('')}</div>` : '';

    return `
      <article class="produto-card ${r.ativo ? '' : 'inactive'}" data-prod-id="${r.id}">
        <div class="produto-thumb">${img}${flagsHtml}</div>
        <div class="produto-body">
          <h3 class="produto-nome">${escapeHtml(r.nome)}</h3>
          <span class="produto-cat">${escapeHtml(CATEGORIA_LABELS[r.categoria] || r.categoria)}</span>
          ${precoHtml}
        </div>
      </article>`;
  }

  function openProductModal(id) {
    const isNew = !id;
    const p = isNew ? null : state.produtos.items.find((x) => x.id === id);
    state.currentProduto = p;

    $('#productModalTitle').textContent = isNew ? 'Novo produto' : 'Editar produto';
    $('#productId').value = p ? p.id : '';
    $('#productNome').value = p ? p.nome : '';
    $('#productSlug').value = p ? p.slug : '';
    $('#productCategoria').value = p ? p.categoria : '';
    $('#productPreco').value = p && p.preco != null ? p.preco : '';
    $('#productOrdem').value = p ? p.ordem : 0;
    $('#productDescricao').value = p ? (p.descricao || '') : '';
    $('#productAtivo').checked = p ? p.ativo : true;
    $('#productDestaque').checked = p ? p.destaque : false;
    $('#productImagemPath').value = p ? (p.imagem_path || '') : '';
    $('#productImagem').value = '';
    $('#productStatus').textContent = '';
    // reset touched state do slug (auto-fill funciona em produtos novos)
    delete $('#productSlug').dataset.touched;
    if (!isNew) $('#productSlug').dataset.touched = '1';

    const preview = $('#productImagemPreview');
    if (p && p.imagem_url) {
      preview.src = p.imagem_url;
      preview.hidden = false;
    } else {
      preview.hidden = true;
      preview.src = '';
    }

    $('#deleteProduct').hidden = isNew;
    $('#productModal').hidden = false;
  }

  function closeProductModal() {
    $('#productModal').hidden = true;
    state.currentProduto = null;
  }

  async function uploadProductImage(file, slug) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `produtos/${crypto.randomUUID()}-${slug}.${ext}`;
    const { error: upErr } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (upErr) throw upErr;
    const { data: pub } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { imagem_url: pub.publicUrl, imagem_path: path };
  }

  async function deleteStorageObject(path) {
    if (!path) return;
    try { await client.storage.from(STORAGE_BUCKET).remove([path]); } catch (_e) { /* silencioso */ }
  }

  async function handleProductSubmit(ev) {
    ev.preventDefault();
    const status = $('#productStatus');
    const saveBtn = $('#saveProduct');
    status.textContent = '';

    const id = $('#productId').value || null;
    const nome = $('#productNome').value.trim();
    const slug = ($('#productSlug').value.trim() || slugify(nome));
    const categoria = $('#productCategoria').value;
    const precoRaw = $('#productPreco').value;
    const preco = precoRaw === '' ? null : Number(precoRaw);
    const ordem = parseInt($('#productOrdem').value, 10) || 0;
    const descricao = $('#productDescricao').value.trim() || null;
    const ativo = $('#productAtivo').checked;
    const destaque = $('#productDestaque').checked;
    const file = $('#productImagem').files[0];
    let imagem_url = state.currentProduto ? state.currentProduto.imagem_url : null;
    let imagem_path = $('#productImagemPath').value || null;

    if (!nome || !slug || !categoria) {
      status.textContent = 'Preencha nome, slug e categoria.';
      status.style.color = '#dc2626';
      return;
    }

    saveBtn.disabled = true;
    status.style.color = '#7a5c5c';
    status.textContent = 'A guardar...';

    try {
      if (file) {
        const oldPath = imagem_path;
        const up = await uploadProductImage(file, slug);
        imagem_url = up.imagem_url;
        imagem_path = up.imagem_path;
        if (oldPath) await deleteStorageObject(oldPath);
      }

      const payload = {
        nome, slug, categoria, preco, ordem, descricao,
        ativo, destaque, imagem_url, imagem_path
      };

      let resp;
      if (id) {
        resp = await client.from('produtos').update(payload).eq('id', id).select().single();
      } else {
        resp = await client.from('produtos').insert(payload).select().single();
      }

      if (resp.error) {
        const msg = resp.error.code === '23505'
          ? 'Já existe um produto com este slug.'
          : 'Erro ao guardar.';
        status.textContent = msg;
        status.style.color = '#dc2626';
        return;
      }

      closeProductModal();
      await loadProdutos();
    } catch (_e) {
      status.textContent = 'Erro de ligação. Tente novamente.';
      status.style.color = '#dc2626';
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function handleProductDelete() {
    const p = state.currentProduto;
    if (!p) return;
    if (!confirm(`Eliminar "${p.nome}"? Esta acção é irreversível.`)) return;

    const status = $('#productStatus');
    status.style.color = '#7a5c5c';
    status.textContent = 'A eliminar...';

    const { error } = await client.from('produtos').delete().eq('id', p.id);
    if (error) {
      status.textContent = 'Erro ao eliminar.';
      status.style.color = '#dc2626';
      return;
    }
    if (p.imagem_path) await deleteStorageObject(p.imagem_path);
    closeProductModal();
    await loadProdutos();
  }

  function autoSlugFromNome() {
    const nome = $('#productNome').value;
    const slugField = $('#productSlug');
    // só preenche auto se estiver vazio ou se for produto novo e o user ainda não tocou no slug
    if (!slugField.dataset.touched) {
      slugField.value = slugify(nome);
    }
  }

  function handleImagePreview(ev) {
    const file = ev.target.files[0];
    const preview = $('#productImagemPreview');
    if (!file) {
      if (state.currentProduto && state.currentProduto.imagem_url) {
        preview.src = state.currentProduto.imagem_url;
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
      return;
    }
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.hidden = false;
  }

  // ===== Pagination =====
  function updatePagination(which) {
    const s = state[which];
    const size = which === 'produtos' ? PRODUTOS_PAGE_SIZE : PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(s.total / size));
    const cap = which.charAt(0).toUpperCase() + which.slice(1);
    $(`#page${cap}`).textContent = `Página ${s.page + 1} de ${totalPages} (${s.total} total)`;
    $(`#prev${cap}`).disabled = s.page === 0;
    $(`#next${cap}`).disabled = s.page + 1 >= totalPages;
  }

  // ===== Init =====
  async function loadAll() {
    activateTab('mensagens');
    await Promise.all([loadMensagens(), loadNewsletter(), loadProdutos()]);
  }

  function bindEvents() {
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#logoutBtn').addEventListener('click', handleLogout);

    $$('.admin-tab').forEach((t) => {
      t.addEventListener('click', () => {
        if (t.disabled) return;
        activateTab(t.dataset.tab);
      });
    });

    // Mensagens
    $('#filterStatus').addEventListener('change', (e) => {
      state.mensagens.status = e.target.value;
      state.mensagens.page = 0;
      loadMensagens();
    });
    $('#searchMensagens').addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        state.mensagens.search = e.target.value.trim();
        state.mensagens.page = 0;
        loadMensagens();
      }, 300);
    });
    $('#refreshMensagens').addEventListener('click', loadMensagens);
    $('#exportMensagens').addEventListener('click', exportMensagens);
    $('#prevMensagens').addEventListener('click', () => {
      if (state.mensagens.page > 0) { state.mensagens.page--; loadMensagens(); }
    });
    $('#nextMensagens').addEventListener('click', () => {
      state.mensagens.page++; loadMensagens();
    });

    // Newsletter
    $('#searchNewsletter').addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        state.newsletter.search = e.target.value.trim();
        state.newsletter.page = 0;
        loadNewsletter();
      }, 300);
    });
    $('#refreshNewsletter').addEventListener('click', loadNewsletter);
    $('#exportNewsletter').addEventListener('click', exportNewsletter);
    $('#prevNewsletter').addEventListener('click', () => {
      if (state.newsletter.page > 0) { state.newsletter.page--; loadNewsletter(); }
    });
    $('#nextNewsletter').addEventListener('click', () => {
      state.newsletter.page++; loadNewsletter();
    });

    // Modal
    $('#modalStatus').addEventListener('change', handleStatusChange);
    $$('#messageModal [data-close]').forEach((el) => el.addEventListener('click', closeMessageModal));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#messageModal').hidden) closeMessageModal();
      if (e.key === 'Escape' && !$('#productModal').hidden) closeProductModal();
    });

    // Produtos
    $('#filterCategoria').addEventListener('change', (e) => {
      state.produtos.categoria = e.target.value;
      state.produtos.page = 0;
      loadProdutos();
    });
    $('#filterAtivo').addEventListener('change', (e) => {
      state.produtos.ativo = e.target.value;
      state.produtos.page = 0;
      loadProdutos();
    });
    $('#searchProdutos').addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        state.produtos.search = e.target.value.trim();
        state.produtos.page = 0;
        loadProdutos();
      }, 300);
    });
    $('#refreshProdutos').addEventListener('click', loadProdutos);
    $('#newProduto').addEventListener('click', () => openProductModal(null));
    $('#prevProdutos').addEventListener('click', () => {
      if (state.produtos.page > 0) { state.produtos.page--; loadProdutos(); }
    });
    $('#nextProdutos').addEventListener('click', () => {
      state.produtos.page++; loadProdutos();
    });

    // Product modal
    $('#productForm').addEventListener('submit', handleProductSubmit);
    $('#deleteProduct').addEventListener('click', handleProductDelete);
    $$('#productModal [data-close]').forEach((el) => el.addEventListener('click', closeProductModal));
    $('#productNome').addEventListener('input', autoSlugFromNome);
    $('#productSlug').addEventListener('input', (e) => { e.target.dataset.touched = '1'; });
    $('#productImagem').addEventListener('change', handleImagePreview);
  }

  async function init() {
    if (!window.supabaseClient) {
      $('#loginStatus').textContent = 'Configuração Supabase em falta.';
      $('#loginStatus').style.color = '#dc2626';
      $('#loginSection').hidden = false;
      return;
    }
    client = window.supabaseClient;
    bindEvents();

    const user = await checkSession();
    if (user) {
      state.user = user;
      showDashboard(user);
      await loadAll();
    } else {
      showLogin();
    }

    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') showLogin();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
