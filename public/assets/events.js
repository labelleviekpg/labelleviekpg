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
    tailleLesJours();
    dessineMois();
    dessineOptions();
    calcule();
  }

  /* ---------- les options ----------
     Une prestation n'est plus tout ou rien. Sur trois semaines, personne ne
     veut un diner les vingt et un soirs : le client designe ses jours, ou
     dit combien de fois. C'est lui qui compose sa semaine. */
  var UNITE = { 1: "per guest, per night", 2: "per guest", 3: "per stay", 4: "per day" };
  var PRIS = {};     /* id -> { q: 1, jours: [...] | null } */
  var MIENS = [];    /* les lignes que le client ecrit lui-meme */

  function nuitsDuSejour(){
    var a = el("a").value, d = el("d").value, out = [];
    if (!a || !d || d <= a) return out;
    var t = new Date(a + "T00:00:00"), fin = new Date(d + "T00:00:00");
    while (t < fin){ out.push(iso(t)); t.setDate(t.getDate() + 1); }
    return out;
  }

  /* Un changement de dates ne doit pas laisser trainer un jour hors sejour. */
  function tailleLesJours(){
    var dedans = {}, n = nuitsDuSejour(), i;
    for (i = 0; i < n.length; i++) dedans[n[i]] = true;
    var net = function(j){ return (j || []).filter(function(x){ return dedans[x]; }); };
    for (var id in PRIS){
      if (PRIS[id] && PRIS[id].jours){
        var g = net(PRIS[id].jours);
        PRIS[id].jours = g.length ? g : null;
      }
    }
    for (i = 0; i < MIENS.length; i++) MIENS[i].jours = net(MIENS[i].jours);
  }

  var JC = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  function puce(j){
    var d = new Date(j + "T00:00:00");
    return JC[d.getDay()] + " " + d.getDate();
  }

  function stripJours(id, choisis, ouvert){
    var n = nuitsDuSejour();
    if (!n.length) return '<span class="aide">Choose your dates first.</span>';
    var tous = !choisis;
    var cpt = tous ? n.length : choisis.length;
    var h = ['<span class="resume">' +
      (tous ? "Every day of the stay" : cpt + " of " + n.length + " days") +
      '</span><button type="button" class="change" data-ouvre="' + E(id) + '">' +
      (ouvert ? "Done" : "Pick the days") + "</button>"];
    if (!ouvert) return h.join("");
    h.push('<span class="raccourcis">' +
      '<button type="button" data-tout="' + E(id) + '">All</button>' +
      '<button type="button" data-rien="' + E(id) + '">None</button></span>');
    h.push('<span class="puces">' + n.map(function(j){
      var on = tous || choisis.indexOf(j) >= 0;
      return '<button type="button" class="puce' + (on ? " on" : "") +
        '" data-jour="' + E(id) + '|' + j + '">' + puce(j) + "</button>";
    }).join("") + "</span>");
    return h.join("");
  }

  var OUVERT = null;   /* l'option dont le choix de jours est deplie */

  function dessineOptions(){
    var c = el("opts");
    if (!c) return;
    c.innerHTML = OPTIONS.map(function(o){
      var pris = PRIS[o.id];
      var h = ['<div class="opt' + (pris ? " on" : "") + '">'];
      h.push('<label><input type="checkbox" data-o="' + E(o.id) + '"' +
        (pris ? " checked" : "") + '><span><b>' + E(o.nom) + "</b><i>" +
        sou(o.prix) + " THB " + (UNITE[o.unite] || "") + "</i></span></label>");
      if (pris){
        if (o.choix === "jours")
          h.push('<div class="reglage">' + stripJours(o.id, pris.jours, OUVERT === o.id) + "</div>");
        else if (o.choix === "sessions")
          h.push('<div class="reglage"><label class="pt" for="q-' + E(o.id) + '">How many</label>' +
            '<input class="nb" id="q-' + E(o.id) + '" type="number" min="1" max="60" value="' +
            (pris.q || 1) + '" data-q="' + E(o.id) + '"><span class="aide">' +
            "each guest, " + sou(o.prix) + " THB a time</span></div>");
      }
      h.push("</div>");
      return h.join("");
    }).join("") + mesLignes();
    dessinePlan();
  }

  /* ---------- les lignes du client ----------
     Temps libre, une excursion, une habitude du groupe. Elles n'ont pas de
     prix : on ne devine pas ce qu'on n'a pas chiffre. Elles voyagent avec la
     demande et arrivent sur la fiche de l'equipe. */
  function mesLignes(){
    var n = nuitsDuSejour();
    var h = ['<div class="opt mien"><b class="tt">Your own plan</b>' +
      '<span class="aide">Free time, an outing, anything you want on the week. ' +
      "We read these and come back with a price if there is one.</span>"];
    for (var i = 0; i < MIENS.length; i++){
      h.push('<div class="ligne-mien"><input class="txt" data-mt="' + i +
        '" value="' + E(MIENS[i].texte) + '" placeholder="What is it">' +
        '<button type="button" class="ote" data-mo="' + i + '" aria-label="Remove">\u00d7</button>');
      if (n.length)
        h.push('<span class="puces">' + n.map(function(j){
          var on = MIENS[i].jours.indexOf(j) >= 0;
          return '<button type="button" class="puce' + (on ? " on" : "") +
            '" data-mj="' + i + "|" + j + '">' + puce(j) + "</button>";
        }).join("") + "</span>");
      h.push("</div>");
    }
    h.push('<button type="button" class="ajoute" id="mien-plus">Add a line</button></div>');
    return h.join("");
  }

  function quantites(){
    var q = {};
    for (var id in PRIS){
      if (!PRIS[id]) continue;
      q[id] = { q: PRIS[id].q || 1 };
      if (PRIS[id].jours) q[id].jours = PRIS[id].jours;
    }
    return q;
  }

  /* Un seul ecouteur sur le bloc, qui survit aux redessins. */
  function brancheOptions(){
    var c = el("opts");
    c.addEventListener("change", function(e){
      var t = e.target;
      if (t.matches("input[data-o]")){
        var id = t.getAttribute("data-o");
        PRIS[id] = t.checked ? { q: 1, jours: null } : null;
        if (!t.checked && OUVERT === id) OUVERT = null;
        dessineOptions(); calcule(); return;
      }
      if (t.matches("input[data-q]")){
        var k = t.getAttribute("data-q");
        if (PRIS[k]) PRIS[k].q = Math.max(1, parseInt(t.value, 10) || 1);
        calcule(); return;
      }
      if (t.matches("input[data-mt]")){
        MIENS[+t.getAttribute("data-mt")].texte = t.value;
      }
    });
    c.addEventListener("input", function(e){
      if (e.target.matches("input[data-mt]"))
        MIENS[+e.target.getAttribute("data-mt")].texte = e.target.value;
    });
    c.addEventListener("click", function(e){
      var b = e.target.closest("button");
      if (!b) return;
      var v;
      if ((v = b.getAttribute("data-ouvre")) !== null){
        OUVERT = OUVERT === v ? null : v; dessineOptions(); return;
      }
      if ((v = b.getAttribute("data-tout")) !== null){
        if (PRIS[v]) PRIS[v].jours = null; dessineOptions(); calcule(); return;
      }
      if ((v = b.getAttribute("data-rien")) !== null){
        if (PRIS[v]) PRIS[v].jours = [];  dessineOptions(); calcule(); return;
      }
      if ((v = b.getAttribute("data-jour")) !== null){
        var p = v.split("|"), id = p[0], j = p[1];
        if (!PRIS[id]) return;
        var liste = PRIS[id].jours ? PRIS[id].jours.slice() : nuitsDuSejour();
        var k = liste.indexOf(j);
        if (k >= 0) liste.splice(k, 1); else liste.push(j);
        liste.sort();
        PRIS[id].jours = liste.length === nuitsDuSejour().length ? null : liste;
        dessineOptions(); calcule(); return;
      }
      if ((v = b.getAttribute("data-mj")) !== null){
        var q = v.split("|"), i = +q[0], jj = q[1];
        var kk = MIENS[i].jours.indexOf(jj);
        if (kk >= 0) MIENS[i].jours.splice(kk, 1); else MIENS[i].jours.push(jj);
        MIENS[i].jours.sort();
        dessineOptions(); return;
      }
      if ((v = b.getAttribute("data-mo")) !== null){
        MIENS.splice(+v, 1); dessineOptions(); return;
      }
      if (b.id === "mien-plus"){
        MIENS.push({ texte: "", jours: [] }); dessineOptions();
        var x = el("opts").querySelectorAll("input[data-mt]");
        if (x.length) x[x.length - 1].focus();
      }
    });
  }

  /* Ce que le client a compose, en clair, pour la demande et pour l'equipe. */
  function monPlan(){
    var out = [];
    for (var i = 0; i < MIENS.length; i++){
      var m = MIENS[i];
      if (!m.texte.trim()) continue;
      out.push("- " + m.texte.trim() +
        (m.jours.length ? " (" + m.jours.map(puce).join(", ") + ")" : ""));
    }
    return out;
  }

  /* ---------- le planning de la semaine ----------
     Les memes donnees que les selecteurs de jours, vues autrement : une
     grille jour par jour, ou le client voit tout son sejour d'un coup. Il
     compose une semaine et la recopie sur les suivantes. */

  function semaines(){
    var n = nuitsDuSejour(), out = [];
    for (var i = 0; i < n.length; i += 7) out.push(n.slice(i, i + 7));
    return out;
  }

  /* Ce qui se pose sur un jour : les prestations choisies au jour, et les
     lignes que le client a ecrites. Le reste, les sessions et les forfaits,
     n'a pas de date et vit a cote. */
  function rangs(){
    var out = [];
    for (var i = 0; i < OPTIONS.length; i++){
      var o = OPTIONS[i];
      if (o.choix !== "jours" || !PRIS[o.id]) continue;
      out.push({ cle: "o:" + o.id, nom: o.nom,
                 jours: PRIS[o.id].jours || nuitsDuSejour().slice() });
    }
    for (var k = 0; k < MIENS.length; k++){
      if (!MIENS[k].texte.trim()) continue;
      out.push({ cle: "m:" + k, nom: MIENS[k].texte.trim(), jours: MIENS[k].jours });
    }
    return out;
  }

  function poseJour(cle, j, on){
    var p = cle.split(":");
    if (p[0] === "o"){
      var id = p[1];
      if (!PRIS[id]) return;
      var liste = PRIS[id].jours ? PRIS[id].jours.slice() : nuitsDuSejour();
      var k = liste.indexOf(j);
      if (on && k < 0) liste.push(j);
      if (!on && k >= 0) liste.splice(k, 1);
      liste.sort();
      PRIS[id].jours = liste.length === nuitsDuSejour().length ? null : liste;
    } else {
      var m = MIENS[+p[1]];
      if (!m) return;
      var q = m.jours.indexOf(j);
      if (on && q < 0) m.jours.push(j);
      if (!on && q >= 0) m.jours.splice(q, 1);
      m.jours.sort();
    }
  }

  /* Recopier une semaine sur toutes les suivantes : chaque jour retenu se
     reporte sept jours plus loin, autant de fois qu'il reste de semaines. */
  function recopie(iSem){
    var sem = semaines(), n = nuitsDuSejour();
    if (iSem >= sem.length - 1) return;
    var source = sem[iSem], dedans = {};
    for (var a = 0; a < n.length; a++) dedans[n[a]] = true;

    var rs = rangs();
    for (var r = 0; r < rs.length; r++){
      var pris = {};
      for (var b = 0; b < rs[r].jours.length; b++) pris[rs[r].jours[b]] = true;
      for (var w = iSem + 1; w < sem.length; w++){
        for (var d = 0; d < sem[w].length; d++){
          var rang = d;                       /* meme rang dans la semaine */
          var modele = source[rang];
          if (modele === undefined) continue;
          poseJour(rs[r].cle, sem[w][d], !!pris[modele]);
        }
      }
    }
    dessineOptions(); dessinePlan(); calcule();
  }

  function sansDate(){
    var out = [];
    for (var i = 0; i < OPTIONS.length; i++){
      var o = OPTIONS[i];
      if (o.choix === "jours" || !PRIS[o.id]) continue;
      out.push(o.choix === "sessions"
        ? (PRIS[o.id].q || 1) + " \u00d7 " + o.nom
        : o.nom);
    }
    return out;
  }

  function dessinePlan(){
    var c = el("plan");
    if (!c) return;
    var sem = semaines(), rs = rangs();

    if (!sem.length){
      c.innerHTML = '<p class="aide">Pick your dates and the week lays itself out here.</p>';
      return;
    }
    if (!rs.length){
      c.innerHTML = '<p class="aide">Tick what you want above, or write your own lines, ' +
        "and your whole stay appears here, day by day.</p>";
      return;
    }

    var h = [];
    for (var w = 0; w < sem.length; w++){
      h.push('<div class="sem">');
      h.push('<div class="sem-tete"><b>' +
        (sem.length > 1 ? "Week " + (w + 1) : "Your stay") + "</b>" +
        '<span class="aide">' + jourCourt(sem[w][0]) + " to " +
        jourCourt(sem[w][sem[w].length - 1]) + "</span>" +
        (w < sem.length - 1
          ? '<button type="button" class="copie" data-copie="' + w +
            '">Copy to the following weeks</button>' : "") + "</div>");

      h.push('<div class="tableau"><table>' +
        '<colgroup><col class="lib">' + sem[w].map(function(){ return "<col>"; }).join("") +
        "</colgroup><thead><tr><th></th>" +
        sem[w].map(function(j){
          return "<th>" + puce(j) + "</th>";
        }).join("") + "</tr></thead><tbody>");

      for (var r = 0; r < rs.length; r++){
        var pris = {};
        for (var b = 0; b < rs[r].jours.length; b++) pris[rs[r].jours[b]] = true;
        h.push("<tr><th>" + E(rs[r].nom) + "</th>" + sem[w].map(function(j){
          var on = !!pris[j];
          return '<td><button type="button" class="jcase' + (on ? " on" : "") +
            '" data-pl="' + E(rs[r].cle) + "|" + j + '" aria-pressed="' +
            (on ? "true" : "false") + '" aria-label="' + E(rs[r].nom) + ", " +
            puce(j) + '">' + (on ? "\u2713" : "") + "</button></td>";
        }).join("") + "</tr>");
      }
      h.push("</tbody></table></div></div>");
    }

    var hors = sansDate();
    if (hors.length)
      h.push('<p class="aide">Across the whole stay, with no fixed day: ' +
        E(hors.join(", ")) + ".</p>");

    c.innerHTML = h.join("");
  }

  function branchePlan(){
    var c = el("plan");
    if (!c) return;
    c.addEventListener("click", function(e){
      var b = e.target.closest("button");
      if (!b) return;
      var v;
      if ((v = b.getAttribute("data-pl")) !== null){
        var p = v.split("|");
        poseJour(p[0], p[1], b.getAttribute("aria-pressed") !== "true");
        dessineOptions(); dessinePlan(); calcule(); return;
      }
      if ((v = b.getAttribute("data-copie")) !== null) recopie(+v);
    });
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
              : c === "THB" || c === "JPY" ? sou(v)   /* ni l'un ni l'autre ne compte de centimes */
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

  /* Le detail ligne a ligne. Rien ne doit rester implicite : chaque nuit avec
     sa saison et son prix, chaque prestation avec le calcul qui donne son
     total. Un client qui compare deux devis doit pouvoir refaire l'addition. */
  var SEM = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  function jourCourt(j){
    var d = new Date(j + "T00:00:00");
    return SEM[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()].slice(0, 3);
  }

  /* Comment une prestation se multiplie, en clair. Le nombre de jours est
     celui que le client a retenu, pas la duree du sejour : annoncer vingt et
     une nuits pour trois diners serait un mensonge, meme avec le bon total. */
  function calculDe(l, v){
    var p = v.personnes, q = l.quantite || 1;
    var nj = l.joursRetenus || v.nuits;
    var bout = [];
    if (l.unite === 3) return (q > 1 ? q + " \u00d7 " : "") +
      "once for the stay, " + enMonnaie(l.prix);
    if (q > 1) bout.push(q + " \u00d7");
    if (l.unite === 2) bout.push(p + " guests");
    else if (l.unite === 1) bout.push(p + " guests \u00d7 " + nj + " nights");
    else bout.push(nj + " days");
    bout.push("\u00d7 " + enMonnaie(l.prix));
    return bout.join(" ");
  }

  /* Les jours retenus, quand ce n'est pas tout le sejour. */
  function joursDe(l){
    if (!l.jours || !l.jours.length) return "";
    return '<span class="sai">' + l.jours.map(puce).join(", ") + "</span>";
  }

  function detail(v){
    var h = ['<details class="repli"><summary>See every line, night by night</summary>'];

    h.push('<table class="nuits"><thead><tr>' +
      "<th>Night</th><th>Season</th><th>Price</th></tr></thead><tbody>");
    for (var i = 0; i < v.detail.length; i++){
      var x = v.detail[i];
      var nom = x.saison ? x.saison.nom : "Outside the published calendar";
      /* "Spring, private season" dit deja ce qu'il est : on n'ajoute le mode
         que lorsque le nom ne le porte pas. */
      var dit = x.saison ? /private|hotel/i.test(x.saison.nom) : true;
      var mode = (x.saison && !dit)
        ? (x.saison.mode === "privee" ? "private season" : "hotel season") : "";
      var cadeau = x.palier === "cadeau 70 USD";
      h.push("<tr" + (cadeau ? ' class="cadeau"' : "") + "><td>" + jourCourt(x.date) +
        (prise(x.date) ? ' <span class="sai">already taken</span>' : "") + "</td>" +
        "<td>" + E(nom) + (mode ? '<span class="sai"> \u00b7 ' + mode + "</span>" : "") +
        (cadeau ? '<span class="sai"> \u00b7 best rate, from the eighth night</span>' : "") +
        "</td><td>" + enMonnaie(x.prix) + "</td></tr>");
    }
    h.push('</tbody><tfoot><tr><td colspan="2">The house, ' + v.nuits +
      " nights, breakfast included</td><td>" + enMonnaie(v.hebergement) +
      "</td></tr></tfoot></table>");

    if (v.lignes.length){
      h.push('<table class="nuits" style="margin-top:28px"><thead><tr>' +
        "<th>What you asked for</th><th>How it adds up</th><th>Total</th>" +
        "</tr></thead><tbody>");
      for (var k = 0; k < v.lignes.length; k++){
        var l = v.lignes[k];
        var jj = joursDe(l);
        h.push("<tr><td>" + E(l.nom) + "</td><td>" +
          '<span class="sai">' + calculDe(l, v) + "</span>" +
          (jj ? "<br>" + jj : "") + "</td><td>" +
          enMonnaie(l.total) + "</td></tr>");
      }
      h.push('</tbody><tfoot><tr><td colspan="2">What you added</td><td>' +
        enMonnaie(v.options) + "</td></tr></tfoot></table>");
    }

    h.push('<table class="nuits" style="margin-top:28px"><tbody>' +
      "<tr><td>The house, " + v.nuits + " nights</td><td></td><td>" +
      enMonnaie(v.hebergement) + "</td></tr>" +
      (v.lignes.length ? "<tr><td>What you added</td><td></td><td>" +
        enMonnaie(v.options) + "</td></tr>" : "") +
      '</tbody><tfoot><tr><td>Total for ' + v.personnes + " guests</td><td></td><td>" +
      enMonnaie(v.total) + "</td></tr></tfoot></table>");

    h.push('<p class="aide">Breakfast for everyone, the self service bar, ' +
      "housekeeping, Wi-Fi and parking are in the price of the house. " +
      "Nothing above is added later.</p>");
    h.push("</details>");
    return h.join("");
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
    h.push(detail(v));
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
    var plan = monPlan();
    if (plan.length)
      corps.message += "\n\nTheir own plan for the week:\n" + plan.join("\n");

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
      el(i).addEventListener("change", function(){
        tailleLesJours(); dessineMois(); dessineOptions(); calcule();
      });
    });
    el("dev").addEventListener("change", function(){ if (devis) montre(devis); });
    brancheOptions();
    branchePlan();
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
