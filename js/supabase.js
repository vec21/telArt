// Inicializa cliente Supabase. Ref: SPEC §6.2
(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  if (!cfg.url || !cfg.anonKey) {
    console.error('[supabase] Config em falta. Copie js/supabase-config.example.js para js/supabase-config.js e preencha.');
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[supabase] supabase-js não carregado.');
    return;
  }
  window.supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
})();
