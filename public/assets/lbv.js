/* La Belle Vie. Menu, apparitions, visionneuse, formulaire de contact.
   Pas de dependance, pas d'etape de build. */
(function(){
  "use strict";

  /* ---------- la barre se pose quand on descend ---------- */
  var barre = document.querySelector(".barre");
  if (barre){
    var hero = document.querySelector(".haut");
    var seuil = function(){ return hero ? Math.max(80, hero.offsetHeight - 110) : 40; };
    var pose = function(){ barre.classList.toggle("pose", window.scrollY > seuil()); };
    pose();
    addEventListener("scroll", pose, { passive:true });
    addEventListener("resize", pose);
    if (!hero) barre.classList.add("pose");
  }

  /* ---------- menu sur telephone ---------- */
  var burger = document.querySelector(".burger");
  var nav = document.querySelector("nav");
  var rideau = document.querySelector(".rideau");
  function menu(ouvert){
    if (!burger || !nav) return;
    burger.setAttribute("aria-expanded", ouvert ? "true" : "false");
    nav.setAttribute("data-ouvert", ouvert ? "oui" : "non");
    if (rideau) rideau.setAttribute("data-ouvert", ouvert ? "oui" : "non");
    document.body.style.overflow = ouvert ? "hidden" : "";
  }
  if (burger){
    burger.addEventListener("click", function(){
      menu(burger.getAttribute("aria-expanded") !== "true");
    });
  }
  if (rideau) rideau.addEventListener("click", function(){ menu(false); });
  if (nav) nav.addEventListener("click", function(e){
    if (e.target.closest("a")) menu(false);
  });

  /* ---------- les blocs montent en arrivant ---------- */
  var cibles = document.querySelectorAll(".monte");
  if (cibles.length){
    if (!("IntersectionObserver" in window)){
      cibles.forEach(function(el){ el.classList.add("la"); });
    } else {
      var oeil = new IntersectionObserver(function(lignes){
        lignes.forEach(function(l){
          if (l.isIntersecting){ l.target.classList.add("la"); oeil.unobserve(l.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
      cibles.forEach(function(el){ oeil.observe(el); });
    }
  }

  /* ---------- visionneuse de photos ---------- */
  var liens = Array.prototype.slice.call(document.querySelectorAll("[data-vue]"));
  if (liens.length){
    var lb = document.createElement("div");
    lb.className = "lb";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML =
      '<button type="button" class="x" aria-label="Close">×</button>' +
      '<button type="button" class="p" aria-label="Previous">‹</button>' +
      '<img alt="">' +
      '<button type="button" class="s" aria-label="Next">›</button>' +
      '<p class="lg"></p>';
    document.body.appendChild(lb);

    var vue = lb.querySelector("img"), lg = lb.querySelector(".lg"), ou = 0, avant = null;

    function montre(i){
      ou = (i + liens.length) % liens.length;
      var a = liens[ou];
      vue.src = a.getAttribute("data-vue");
      vue.alt = a.getAttribute("data-lg") || "";
      lg.textContent = a.getAttribute("data-lg") || "";
    }
    function ouvre(i){
      avant = document.activeElement;
      montre(i);
      lb.setAttribute("data-ouvert", "oui");
      document.body.setAttribute("data-visionneuse", "oui");
      document.body.style.overflow = "hidden";
      lb.querySelector(".x").focus();
    }
    function ferme(){
      lb.removeAttribute("data-ouvert");
      document.body.removeAttribute("data-visionneuse");
      document.body.style.overflow = "";
      vue.src = "";
      if (avant && avant.focus) avant.focus();
    }

    liens.forEach(function(a, i){
      a.addEventListener("click", function(e){ e.preventDefault(); ouvre(i); });
    });
    lb.querySelector(".x").addEventListener("click", ferme);
    lb.querySelector(".p").addEventListener("click", function(){ montre(ou - 1); });
    lb.querySelector(".s").addEventListener("click", function(){ montre(ou + 1); });
    lb.addEventListener("click", function(e){ if (e.target === lb) ferme(); });
    addEventListener("keydown", function(e){
      if (lb.getAttribute("data-ouvert") !== "oui") return;
      if (e.key === "Escape") ferme();
      if (e.key === "ArrowLeft") montre(ou - 1);
      if (e.key === "ArrowRight") montre(ou + 1);
    });
  }

  /* ---------- formulaire de contact ---------- */
  var form = document.getElementById("form-contact");
  if (form){
    var dit = document.getElementById("form-dit");
    var envoi = document.getElementById("form-envoi");
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var d = new FormData(form);
      var corps = {
        nom:    (d.get("nom")    || "").toString().trim(),
        mail:   (d.get("mail")   || "").toString().trim(),
        tel:    (d.get("tel")    || "").toString().trim(),
        sujet:  (d.get("sujet")  || "").toString().trim(),
        message:(d.get("message")|| "").toString().trim(),
        piege:  (d.get("site")   || "").toString()
      };
      if (!corps.nom || !corps.mail || !corps.message){
        dit.className = "dit non";
        dit.textContent = "Please fill in your name, your email and your message.";
        return;
      }
      dit.className = "dit";
      dit.textContent = "Sending…";
      envoi.disabled = true;

      fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corps)
      }).then(function(r){
        return r.json().then(function(j){ return { ok: r.ok, j: j }; });
      }).then(function(x){
        if (!x.ok) throw new Error(x.j && x.j.erreur || "refus");
        dit.className = "dit ok";
        dit.textContent = "Thank you. Your message has reached us, we answer within a day.";
        form.reset();
      }).catch(function(){
        dit.className = "dit non";
        dit.innerHTML = 'Something went wrong. Please write to ' +
          '<a href="mailto:events@labelleviekpg.com">events@labelleviekpg.com</a> instead.';
      }).then(function(){ envoi.disabled = false; });
    });
  }

  /* ---------- l'annee du bas ---------- */
  var an = document.getElementById("annee");
  if (an) an.textContent = new Date().getFullYear();
})();
