// admin.js — Painel administrativo Tel'Art (SPEC §2.0)
// Stack: vanilla JS + supabase-js (carregado via CDN no admin.html)

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ===== Config =====
  const PAGE_SIZE = 25;
  const WHATSAPP_BASE = 'https://wa.me/';

  // ===== State =====
  const state = {
    user: null,
    tab: 'mensagens',
    mensagens: { items: [], page: 0, total: 0, status: '', search: '' },
    newsletter: { items: [], page: 0, total: 0, search: '' },
    currentMessage: null
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

  // ===== Pagination =====
  function updatePagination(which) {
    const s = state[which];
    const totalPages = Math.max(1, Math.ceil(s.total / PAGE_SIZE));
    const cap = which.charAt(0).toUpperCase() + which.slice(1);
    $(`#page${cap}`).textContent = `Página ${s.page + 1} de ${totalPages} (${s.total} total)`;
    $(`#prev${cap}`).disabled = s.page === 0;
    $(`#next${cap}`).disabled = s.page + 1 >= totalPages;
  }

  // ===== Init =====
  async function loadAll() {
    activateTab('mensagens');
    await Promise.all([loadMensagens(), loadNewsletter()]);
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
    });
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
