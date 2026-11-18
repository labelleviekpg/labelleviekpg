/* La page evenements : la porte de demonstration, le calendrier des
   disponibilites, le calculateur et la demande. Tout passe par /api/events,
   qui parle au moteur de prix. Rien n'est calcule ici. */
(function(){
  "use strict";

  var el = function(i){ return document.getElementById(i); };
  var E  = function(s){ return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };

  /* ---------- la porte ----------
     Une demonstration, pas une vraie connexion : aucun mot de passe n'est
     demande, aucun compte n'est cree, rien n'est envoye nulle part. Le but
     est de montrer a quoi ressemblera l'accueil d'un prospect. */
  var PORTE = "lbv-events-vu";
  var porte = el("porte");
  if (porte){
    var deja = false;
    try { deja = localStorage.getItem(PORTE) === "oui"; } catch (e) {}
    if (deja) porte.hidden = true;
    else document.body.style.overflow = "hidden";

    var ouvre = function(){
      porte.hidden = true;
      document.body.style.overflow = "";
      try { localStorage.setItem(PORTE, "oui"); } catch (e) {}
    };
    el("porte-go").addEventListener("click", ouvre);
    el("porte-non").addEventListener("click", ouvre);
    addEventListener("keydown", function(e){
      if (!porte.hidden && e.key === "Escape") ouvre();
    });
  }

  if (!el("calc")) return;

  /* ---------- etat ---------- */
  var REGLES = null, OPTIONS = [], PRISES = [], SAISONS = [];
  var TAUX = { THB: 1 }, MONNAIES = [{ code:"THB", nom:"Thai baht", signe:"฿" }];
  var devis = null, quand = null;

  var auj = new Date();
  var curseur = new Date(auj.getFullYear(), auj.getMonth(), 1);

  /* Ouvrir sur un mois ou rien n'est vendable donne l'impression d'une maison
     fermee. On demarre au premier mois qui porte une saison, sauf si le mois
     courant est deja dedans. */
  function cale(){
    if (!SAISONS.length) return;
    var fin = SAISONS[SAISONS.length - 1].d2;
    if (iso(curseur) > fin) return;            // tout le calendrier est passe
    var debut = SAISONS[0].d1;
    var premier = new Date(+debut.slice(0,4), +debut.slice(5,7) - 1, 1);
    if (curseur < premier) curseur = premier;
  }

  var MOIS = ["January","February","March","April","May","June",
              "July","August","September","October","November","December"];
  var JOURS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  function iso(d){
    return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") +
           "-" + String(d.getDate()).padStart(2,"0");
  }
  function sou(n){ return Math.round(n).toLocaleString("en-US"); }

  function prise(j){
    for (var i = 0; i < PRISES.length; i++)
      if (j >= PRISES[i].d1 && j <= PRISES[i].d2) return true;
    return false;
  }
  function saisonDe(j){
    for (var i = 0; i < SAISONS.length; i++)
      if (j >= SAISONS[i].d1 && j <= SAISONS[i].d2) return SAISONS[i];
    return null;
  }

  /* ---------- le calendrier ---------- */
  function dessineMois(){
    var c = el("mois");
    if (!c) return;
    var html = "", n;
    for (n = 0; n < 2; n++){
      var d = new Date(curseur.getFullYear(), curseur.getMonth() + n, 1);
      html += '<div class="mois"><h4>' + MOIS[d.getMonth()] + " " + d.getFullYear() + "</h4>";
      html += '<div class="jours">';
      for (var k = 0; k < 7; k++) html += '<span class="tete">' + JOURS[k] + "</span>";
      var premier = (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7;
      for (var v = 0; v < premier; v++) html += "<span></span>";
      var fin = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      for (var j = 1; j <= fin; j++){
        var jour = iso(new Date(d.getFullYear(), d.getMonth(), j));
        var cls = [], s = saisonDe(jour);
        if (prise(jour)) cls.push("pris");
        else if (s) cls.push(s.mode === "privee" ? "privee" : "hotel");
        else cls.push("hors");
        if (jour === el("a").value) cls.push("bord");
        if (jour === el("d").value) cls.push("bord");
        if (el("a").value && el("d").value && jour > el("a").value && jour < el("d").value)
          cls.push("entre");
        html += '<button type="button" class="' + cls.join(" ") + '" data-j="' + jour +
                '" title="' + (prise(jour) ? "Taken" : s ? E(s.nom) : "Outside the calendar") + '">' +
                j + "</button>";
      }
      html += "</div></div>";
    }
    c.innerHTML = html;
  }

  function clicJour(e){
    var b = e.target.closest("button[data-j]");
    if (!b) return;
    var j = b.getAttribute("data-j");
    var a = el("a").value, dd = el("d").value;
    if (!a || (a && dd) || j <= a){ el("a").value = j; el("d").value = ""; }
    else el("d").value = j;
    dessineMois();
    calcule();
  }

  /* ---------- les options ---------- */
  var UNITE = { 1: "per guest, per night", 2: "per guest", 3: "per stay", 4: "per day" };
  function dessineOptions(){
    var c = el("opts");
    if (!c) return;
    c.innerHTML = OPTIONS.map(function(o){
      return '<label class="opt"><input type="checkbox" data-o="' + E(o.id) + '">' +
        '<span><b>' + E(o.nom) + "</b><i>" + sou(o.prix) + " THB " +
        (UNITE[o.unite] || "") + "</i></span></label>";
    }).join("");
  }
  function quantites(){
    var q = {};
    Array.prototype.forEach.call(document.querySelectorAll("#opts input[data-o]"), function(i){
      if (i.checked) q[i.getAttribute("data-o")] = 1;
    });
    return q;
  }

  /* ---------- la monnaie ---------- */
  function dessineMonnaies(){
    var s = el("dev");
    if (!s) return;
    s.innerHTML = MONNAIES.map(function(m){
      return '<option value="' + E(m.code) + '">' + E(m.code) + " · " + E(m.nom) + "</option>";
    }).join("");
  }
  function enMonnaie(thb){
    var c = el("dev").value || "THB", t = TAUX[c];
    var m = MONNAIES.filter(function(x){ return x.code === c; })[0];
    if (!t || !m) return sou(thb) + " THB";
    var v = thb / t;
    var texte = c === "BTC" ? v.toFixed(4)
              : v >= 1000 ? sou(v)
              : v.toFixed(2);
    return m.signe + " " + texte + (c === "THB" ? "" : "");
  }

  /* ---------- le devis ---------- */
  function calcule(){
    var a = el("a").value, d = el("d").value;
    var p = Math.max(1, parseInt(el("p").value, 10) || 1);
    if (!a || !d || d <= a){ el("somme").innerHTML = attente(); return; }

    var mien = quand = Date.now();
    el("somme").innerHTML = '<p class="aide">Calculating…</p>';
    fetch("/api/events/devis", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ arrivee: a, depart: d, personnes: p, options: quantites() })
    }).then(function(r){ return r.json(); }).then(function(v){
      if (mien !== quand) return;            // une frappe plus recente a gagne
      if (v.erreur) throw new Error(v.erreur);
      devis = v;
      montre(v);
    }).catch(function(){
      if (mien !== quand) return;
      el("somme").innerHTML = '<p class="aide">We could not reach the calculator. ' +
        'Please <a href="#demande">send us your dates</a> instead.</p>';
    });
  }

  function attente(){
    return '<p class="aide">Pick an arrival and a departure on the calendar, ' +
           'or type them above, and the price appears here.</p>';
  }

  function montre(v){
    var h = [];
    var chevauche = false, j;
    for (j = 0; j < v.detail.length; j++) if (prise(v.detail[j].date)) chevauche = true;

    if (v.tropCourt)
      h.push('<p class="alerte">The house is let for a minimum of ' +
        REGLES.nuitsMinimum + ' nights. Your dates cover ' + v.nuits + '.</p>');
    if (v.tropDeMonde)
      h.push('<p class="alerte">The house sleeps ' + REGLES.capacite +
        '. You have entered ' + v.personnes + ' guests.</p>');
    if (v.horsCalendrier)
      h.push('<p class="alerte">' + v.horsCalendrier + ' of your nights fall outside the ' +
        'published calendar. Write to us and we will price them by hand.</p>');
    if (chevauche)
      h.push('<p class="alerte">Some of those dates are already taken. ' +
        'Send the request anyway and we will propose the nearest free window.</p>');

    h.push('<div class="chiffre"><span>' + v.nuits + " nights, " + v.personnes +
      ' guests</span><b>' + enMonnaie(v.total) + "</b></div>");
    h.push('<table class="detail"><tbody>');
    h.push("<tr><td>The house, breakfast included</td><td>" +
      enMonnaie(v.hebergement) + "</td></tr>");
    for (j = 0; j < v.lignes.length; j++)
      h.push("<tr><td>" + E(v.lignes[j].nom) + "</td><td>" +
        enMonnaie(v.lignes[j].total) + "</td></tr>");
    h.push("</tbody><tfoot><tr><td>Total</td><td>" + enMonnaie(v.total) +
      "</td></tr></tfoot></table>");
    h.push('<p class="aide">' + enMonnaie(v.moyenneNuit) + " a night · " +
      enMonnaie(v.parPersonneNuit) + " per guest, per night. " +
      "Prices in Thai baht, converted for guidance.</p>");
    h.push('<div class="bts"><a class="bt" href="#demande">Request these dates</a></div>');
    el("somme").innerHTML = h.join("");
  }

  /* ---------- la demande ---------- */
  function envoie(){
    var dit = el("q-dit");
    var a = el("a").value, d = el("d").value;
    if (!a || !d || d <= a){
      dit.className = "dit non"; dit.textContent = "Please choose your dates first."; return;
    }
    var corps = {
      arrivee: a, depart: d,
      personnes: Math.max(1, parseInt(el("p").value, 10) || 1),
      options: quantites(),
      nom: el("q-nom").value.trim(),
      organisation: el("q-org").value.trim(),
      courriel: el("q-mail").value.trim(),
      tel: el("q-tel").value.trim(),
      pays: el("q-pays").value.trim(),
      message: ("Event type: " + el("q-type").value + "\n\n" + el("q-msg").value).trim()
    };
    if (!corps.nom || !corps.courriel){
      dit.className = "dit non"; dit.textContent = "We need a name and an email to answer you."; return;
    }
    dit.className = "dit"; dit.textContent = "Sending…";
    el("q-go").disabled = true;

    fetch("/api/events/demande", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(corps)
    }).then(function(r){ return r.json(); }).then(function(v){
      if (v.erreur) throw new Error(v.erreur);
      el("demande").innerHTML =
        '<div class="recu"><span class="sur">Received</span>' +
        "<h2>Thank you. We have your dates.</h2><hr class=\"filet\">" +
        "<p>One of us reads this within the day and comes back with a firm answer " +
        "on availability, plus a written quote you can forward.</p>" +
        "<p class=\"aide\">Reference " + E(v.id) + "</p></div>";
      el("demande").scrollIntoView({ behavior: "smooth", block: "center" });
    }).catch(function(){
      dit.className = "dit non";
      dit.innerHTML = 'Something went wrong. Please write to ' +
        '<a href="mailto:events@labelleviekpg.com">events@labelleviekpg.com</a>.';
    }).then(function(){
      /* en cas de succes le bouton n'existe plus : la page de remerciement a
         pris sa place */
      var b = el("q-go");
      if (b) b.disabled = false;
    });
  }

  /* ---------- demarrage ---------- */
  function branche(){
    el("mois").addEventListener("click", clicJour);
    el("prec").addEventListener("click", function(){
      curseur.setMonth(curseur.getMonth() - 1); dessineMois();
    });
    el("suiv").addEventListener("click", function(){
      curseur.setMonth(curseur.getMonth() + 1); dessineMois();
    });
    ["a","d","p"].forEach(function(i){
      el(i).addEventListener("change", function(){ dessineMois(); calcule(); });
    });
    el("dev").addEventListener("change", function(){ if (devis) montre(devis); });
    el("opts").addEventListener("change", calcule);
    el("q-go").addEventListener("click", envoie);
  }

  fetch("/api/events/calendrier").then(function(r){ return r.json(); }).then(function(v){
    REGLES = v.regles; OPTIONS = v.options || []; PRISES = v.prises || []; SAISONS = v.saisons || [];
    el("p").max = REGLES.capacite;
    el("p").value = Math.min(12, REGLES.capacite);
    el("capacite").textContent = REGLES.capacite;
    el("minimum").textContent = REGLES.nuitsMinimum;
    el("chambres").textContent = REGLES.chambres;
    cale();
    dessineOptions(); dessineMois(); branche();
    el("somme").innerHTML = attente();
  }).catch(function(){
    el("calc").innerHTML = '<p class="alerte">The calculator is unavailable for a moment. ' +
      'Please write to <a href="mailto:events@labelleviekpg.com">events@labelleviekpg.com</a> ' +
      'and we will answer with a quote.</p>';
  });

  fetch("/api/events/change").then(function(r){ return r.json(); }).then(function(v){
    if (v.monnaies && v.taux){ MONNAIES = v.monnaies; TAUX = v.taux; }
    dessineMonnaies();
    if (devis) montre(devis);
  }).catch(function(){ dessineMonnaies(); });
})();
