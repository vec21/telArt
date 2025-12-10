(function(){
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const phoneNumber = '244923862830';

  function setCurrentYear(){
    $$('#year').forEach(el => { el.textContent = new Date().getFullYear(); });
  }

  function initMobileMenu(){
    const menuToggle = $('#menuToggle');
    const mobileMenu = $('#mobileMenu');
    if(!menuToggle || !mobileMenu) return;
    menuToggle.addEventListener('click', ()=>{
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      mobileMenu.hidden = expanded;
    });
  }

  function initQuoteForm(){
    const form = $('#quoteForm');
    if(!form) return;
    const status = $('#quoteStatus');
    const errName = $('#err-quote-name');
    const errContact = $('#err-quote-contact');
    const errCategory = $('#err-quote-category');
    const errBudget = $('#err-quote-budget');
    const errDetails = $('#err-quote-details');

    function clearErrors(){
      [errName, errContact, errCategory, errBudget, errDetails].forEach(el => { if(el) el.textContent = ''; });
      if(status){
        status.textContent = '';
        status.style.color = '';
      }
    }

    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      clearErrors();

      const name = form.quoteName.value.trim();
      const contact = form.quoteContact.value.trim();
      const category = form.quoteCategory.value.trim();
      const budget = form.quoteBudget.value.trim();
      const details = form.quoteDetails.value.trim();

      let valid = true;
      if(name.length < 2){ errName.textContent = 'Informe o seu nome.'; valid = false; }
      if(contact.length < 6){ errContact.textContent = 'Partilhe um número ou e-mail válido.'; valid = false; }
      if(!category){ errCategory.textContent = 'Selecione uma categoria.'; valid = false; }
      if(!budget || Number(budget.replace(/\D/g,'')) <= 0){ errBudget.textContent = 'Indique o orçamento aproximado.'; valid = false; }
      if(details.length < 10){ errDetails.textContent = 'Descreva o que precisa (mínimo 10 caracteres).'; valid = false; }

      if(!valid) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if(submitBtn) submitBtn.disabled = true;
      if(status){
        status.textContent = 'A preparar o seu pedido...';
        status.style.color = '#7a5c5c';
      }

      setTimeout(()=>{
        const message = `Pedido de orçamento rápido:%0A• Nome: ${encodeURIComponent(name)}%0A• Contacto: ${encodeURIComponent(contact)}%0A• Categoria: ${encodeURIComponent(category)}%0A• Orçamento aproximado: ${encodeURIComponent(budget)} Kz%0A• Detalhes: ${encodeURIComponent(details)}%0A%0A"O toque mágico para não espumar" ✨`;
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
        if(status){
          status.textContent = 'Pedido enviado! Abrimos o WhatsApp com o resumo.';
          status.style.color = '#22c55e';
        }
        form.reset();
        if(submitBtn) submitBtn.disabled = false;
      }, 800);
    });
  }

  function initNewsletterForm(){
    const form = $('#newsletterForm');
    if(!form) return;
    const status = $('#newsletterStatus');
    const emailInput = $('#newsletterEmail');

    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      if(status){
        status.textContent = '';
        status.style.color = '';
      }

      const email = emailInput.value.trim();
      const validEmail = /^\S+@\S+\.\S+$/.test(email);
      if(!validEmail){
        if(status){
          status.textContent = 'Digite um e-mail válido.';
          status.style.color = '#ef4444';
        }
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if(submitBtn) submitBtn.disabled = true;
      if(status){
        status.textContent = 'Guardando o seu e-mail...';
        status.style.color = '#7a5c5c';
      }

      setTimeout(()=>{
        if(status){
          status.textContent = 'Obrigada! Você fará parte da nossa lista VIP.';
          status.style.color = '#22c55e';
        }
        localStorage.setItem('telart-newsletter-email', email);
        form.reset();
        if(submitBtn) submitBtn.disabled = false;
      }, 900);
    });
  }

  function initContactForm(){
    const contactForm = $('#contactForm');
    if(!contactForm) return;
    const fields = {
      name: $('#name'),
      email: $('#email'),
      subject: $('#subject'),
      message: $('#message')
    };
    const errors = {
      name: $('#err-name'),
      email: $('#err-email'),
      subject: $('#err-subject'),
      message: $('#err-message')
    };
    const status = $('#formStatus');

    function clearContactErrors(){
      Object.values(errors).forEach(el => { if(el) el.textContent = ''; });
      if(status){
        status.textContent = '';
        status.style.color = '';
      }
    }

    contactForm.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      clearContactErrors();

      const name = fields.name.value.trim();
      const email = fields.email.value.trim();
      const subject = fields.subject.value.trim();
      const message = fields.message.value.trim();

      let ok = true;
      if(name.length < 2){ errors.name.textContent = 'Informe seu nome completo.'; ok = false; }
      if(!/^\S+@\S+\.\S+$/.test(email)){ errors.email.textContent = 'E-mail inválido.'; ok = false; }
      if(!subject){ errors.subject.textContent = 'Selecione um assunto.'; ok = false; }
      if(message.length < 10){ errors.message.textContent = 'Mensagem muito curta (mínimo 10 caracteres).'; ok = false; }

      if(!ok) return;

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      if(submitBtn) submitBtn.disabled = true;
      if(status){
        status.textContent = 'Enviando mensagem...';
        status.style.color = '#7a5c5c';
      }

      setTimeout(()=>{
        if(status){
          status.textContent = 'Mensagem enviada com sucesso! Responderemos em até 24 horas.';
          status.style.color = '#22c55e';
        }
        contactForm.reset();
        if(submitBtn) submitBtn.disabled = false;
      }, 1500);
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    setCurrentYear();
    initMobileMenu();
    initQuoteForm();
    initNewsletterForm();
    initContactForm();
  });
})();
