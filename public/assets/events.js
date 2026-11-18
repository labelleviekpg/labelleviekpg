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
     est de montrer a quoi ressemblera l'accueil d'un prospect.

     Deux portes, et deux maisons derriere. Qui s'enregistre voit tout. Qui
     passe sans s'enregistrer garde les dates, le calendrier et le choix des
     prestations, mais les montants arrivent masques : le premier chiffre
     seulement, assez pour situer l'ordre de grandeur, pas assez pour s'en
     servir ou le faire circuler. */
  var PORTE = "lbv-events-vu";
  var INSCRIT = false;
  var porte = el("porte");
  try {
    var vu = localStorage.getItem(PORTE);
    /* "oui" est l'ancienne forme, d'avant les deux portes : on la traite en
       inscrit plutot que de masquer les prix a quelqu'un qui les voyait. */
    INSCRIT = vu === "inscrit" || vu === "oui";
  } catch (e) {}

  /* Promettre le prix a la baht au-dessus d'un montant masque, ce serait se
     contredire a l'ecran. Le titre dit ce que le visiteur voit vraiment. */
  function titrePrix(){
    var t = el("prix-t"), q = el("prix-p");
    if (!t || !q) return;
    if (INSCRIT){
      t.textContent = "What your stay costs, to the baht";
      q.textContent = "No form to fill in first, no one calling you back with " +
        "a number. The same rates we quote by email.";
    } else {
      t.textContent = "What your stay would cost";
      q.textContent = "Build the stay you have in mind, night by night. " +
        "Sign in when you want the figures in full.";
    }
  }
  function rafraichit(){
    if (!el("calc")) return;
    titrePrix();
    if (devis) montre(devis);
    dessinePlan();
  }
  function passe(quoi){
    INSCRIT = quoi === "inscrit";
    if (porte){ porte.hidden = true; document.body.style.overflow = ""; }
    try { localStorage.setItem(PORTE, quoi); } catch (e) {}
    rafraichit();
  }
  function rouvre(){
    if (!porte) return;
    porte.hidden = false;
    document.body.style.overflow = "hidden";
    var b = el("porte-go"); if (b && b.focus) b.focus();
  }
  if (porte){
    if (INSCRIT || (function(){ try { return !!localStorage.getItem(PORTE); }
                                catch (e) { return false; } })())
      porte.hidden = true;
    else document.body.style.overflow = "hidden";

    el("porte-go").addEventListener("click", function(){ passe("inscrit"); });
    el("porte-non").addEventListener("click", function(){ passe("visiteur"); });
    addEventListener("keydown", function(e){
      if (!porte.hidden && e.key === "Escape") passe("visiteur");
    });
  }
  document.addEventListener("click", function(e){
    var b = e.target && e.target.closest ? e.target.closest("[data-entre]") : null;
    if (!b) return;
    e.preventDefault();
    rouvre();
  });

  /* On garde le premier chiffre et la forme du nombre. Un prospect voit
     qu'on parle de centaines de milliers, pas de dizaines, et il lui faut
     s'enregistrer pour en savoir plus. */
  function masque(t){
    var premier = false;
    return String(t).replace(/\d/g, function(c){
      if (!premier){ premier = true; return c; }
      return "\u2022";
    });
  }
  function verrou(titre, phrase){
    return '<div class="verrou"><b>' + E(titre) + "</b><p>" + E(phrase) + "</p>" +
      '<button type="button" class="bt" data-entre>Sign in to see it</button></div>';
  }

  if (!el("calc")) return;
  titrePrix();

  /* Combien ils sont. Une seule lecture du champ, pour que le calcul du
     serveur et ce qu'on ecrit a l'ecran ne divergent jamais. */
  function monde(){ return Math.max(1, parseInt(el("p").value, 10) || 1); }

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

  function stripJours(id, choisis, ouvert, indicatif){
    var n = nuitsDuSejour();
    if (!n.length) return '<span class="aide">Choose your dates first.</span>';
    var tous = !choisis;
    var cpt = tous ? n.length : choisis.length;
    var h = [(indicatif
        ? '<span class="aide">' + (tous || !cpt ? "No day set yet" : cpt + " day" +
            (cpt > 1 ? "s" : "") + " marked") + "</span>"
        : '<span class="resume">' +
            (tous ? "Every day of the stay" : cpt + " of " + n.length + " days") +
            "</span>") +
      '<button type="button" class="change" data-ouvre="' + E(id) + '">' +
      (ouvert ? "Done" : indicatif ? "Mark the days" : "Pick the days") + "</button>"];
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
      /* La case n'est pas imbriquee dans le libelle : un clic qui touche les
         deux declenche alors deux activations, et la case revient a son etat
         de depart. Elles sont donc voisines, reliees par for. */
      h.push('<div class="tete"><input type="checkbox" id="o-' + E(o.id) +
        '" data-o="' + E(o.id) + '"' + (pris ? " checked" : "") +
        '><label for="o-' + E(o.id) + '"><b>' + E(o.nom) + "</b><i>" +
        sou(o.prix) + " THB " +
        (o.gens ? "per person, per session" : (UNITE[o.unite] || "")) +
        "</i></label></div>");
      if (pris){
        if (o.choix === "jours")
          h.push('<div class="reglage">' + stripJours(o.id, pris.jours, OUVERT === o.id) + "</div>");
        else if (o.choix === "sessions" || o.choix === "sessions-jours"){
          /* Quand des jours sont marques, c'est eux qui font le compte : on
             n'en laisse pas deux a tenir en accord. */
          var cale = o.choix === "sessions-jours" && pris.jours && pris.jours.length;
          var fois = cale ? pris.jours.length : (pris.q || 1);
          h.push('<div class="reglage"><label class="pt" for="q-' + E(o.id) + '">' +
            (o.gens ? "How many sessions" : "How many") + "</label>" +
            '<input class="nb" id="q-' + E(o.id) + '" type="number" min="1" max="60" value="' +
            fois + '" data-q="' + E(o.id) + '"' +
            (cale ? " readonly" : "") + '><span class="aide">' +
            (cale ? "one a day, from the days you marked"
                  : o.gens ? sou(o.prix) + " THB a person, each time"
                  : "each guest, " + sou(o.prix) + " THB a time") + "</span></div>");
          /* Douze personnes ne passent pas sous douze paires de mains en meme
             temps. On demande combien a chaque fois, et on dit tout de suite
             combien de personnes le compte couvre en tout. */
          if (o.gens){
            var tous = monde();
            var par = Math.max(1, Math.min(tous, parseInt(pris.gens, 10) || tous));
            var couvre = fois * par;
            h.push('<div class="reglage"><label class="pt" for="g-' + E(o.id) + '">' +
              "People each time</label>" +
              '<input class="nb" id="g-' + E(o.id) + '" type="number" min="1" max="' + tous +
              '" value="' + par + '" data-g="' + E(o.id) + '"><span class="aide">' +
              fois + (fois > 1 ? " sessions" : " session") + " of " + par +
              ", " + couvre + " in all" +
              (couvre === tous ? ", your whole group"
                : couvre < tous ? ", " + (tous - couvre) + " of your group left out"
                : ", more than your group") + "</span></div>");
          }
          /* Les jours disent quand, pas combien : le prix suit le nombre de
             seances, les dates servent a l'equipe. */
          if (o.choix === "sessions-jours")
            h.push('<div class="reglage"><span class="resume">Which days</span>' +
              stripJours(o.id, pris.jours, OUVERT === o.id, true) + "</div>");
        }
      }
      h.push("</div>");
      return h.join("");
    }).join("") + mesDemandes() + mesLignes();
    dessinePlan();
  }

  /* ---------- les demandes speciales ----------
     Ce qui ne se met pas dans une grille tarifaire : une arrivee a six heures
     du matin, une salle montee en cercle, une allergie. On propose les plus
     courantes pour que le client n'ait pas la page blanche, et il decrit. */
  var DEMANDES = [
    "Early check in",
    "Late check out",
    "Airport or pier pickup outside normal hours",
    "A room set up for yoga, a workshop or a meeting",
    "Projector, screen and sound",
    "Dietary needs, allergies, vegetarian or vegan",
    "A birthday or an anniversary to mark",
    "Flowers and decoration in the rooms",
    "Laundry turned around quickly",
    "Scooter or bicycle hire",
    "Something else"
  ];
  var SPEC = [];   /* [{ quoi, detail }] */

  function mesDemandes(){
    var h = ['<div class="opt mien"><b class="tt">Special requests</b>' +
      '<span class="aide">Anything that does not fit a price list. Pick the ones ' +
      "you need and tell us what you have in mind.</span>"];
    for (var i = 0; i < SPEC.length; i++){
      h.push('<div class="ligne-mien"><select class="txt" data-sq="' + i + '">' +
        DEMANDES.map(function(d){
          return '<option' + (SPEC[i].quoi === d ? " selected" : "") + ">" + E(d) + "</option>";
        }).join("") + "</select>" +
        '<button type="button" class="ote" data-so="' + i + '" aria-label="Remove">\u00d7</button>' +
        '<input class="txt" data-sd="' + i + '" value="' + E(SPEC[i].detail) +
        '" placeholder="Tell us more, times, numbers, names"></div>');
    }
    h.push('<button type="button" class="ajoute" id="spec-plus">Add a request</button></div>');
    return h.join("");
  }

  /* ---------- les lignes du client ----------
     Temps libre, une excursion, une habitude du groupe. Le client dit ce que
     ca coute a son groupe, pour que chacun sache a quoi s'attendre. Ce qui
     nous concerne, nous le chiffrons et nous le lui ecrivons. */
  var TARIFS = [
    ["devis",        "We should quote it"],
    ["gratuit",      "Free, nothing to pay"],
    ["participation","With a contribution"],
    ["paye",         "Paid"],
    ["dehors",       "We arrange and pay it ourselves"]
  ];

  function mesLignes(){
    var n = nuitsDuSejour();
    var h = ['<div class="opt mien"><b class="tt">Your own plan</b>' +
      '<span class="aide">Free time, an outing, anything you want on the week. ' +
      "We read these and come back with a price if there is one.</span>"];
    for (var i = 0; i < MIENS.length; i++){
      var m = MIENS[i];
      h.push('<div class="ligne-mien"><input class="txt" data-mt="' + i +
        '" value="' + E(m.texte) + '" placeholder="What is it">' +
        '<button type="button" class="ote" data-mo="' + i + '" aria-label="Remove">\u00d7</button>' +
        '<span class="sous"><select class="pt-sel" data-mtar="' + i + '">' +
        TARIFS.map(function(t){
          return '<option value="' + t[0] + '"' + (m.tarif === t[0] ? " selected" : "") +
            ">" + E(t[1]) + "</option>";
        }).join("") + "</select>" +
        ((m.tarif === "participation" || m.tarif === "paye")
          ? '<input class="nb" data-mmt="' + i + '" type="number" min="0" step="50" value="' +
            (m.montant || "") + '" placeholder="THB"><label class="pay"><input type="checkbox" ' +
            'data-mav="' + i + '"' + (m.avance ? " checked" : "") + ">Paid before arrival</label>"
          : "") + "</span>");
      if (n.length)
        h.push('<span class="puces">' + n.map(function(j){
          var on = m.jours.indexOf(j) >= 0;
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
      if (PRIS[id].gens) q[id].gens = PRIS[id].gens;
    }
    return q;
  }

  /* Refaire le HTML pendant que le navigateur traite encore le clic coupe la
     suite de l'evenement : un clic sur le libelle d'une case se perdait, le
     navigateur ne trouvant plus la case qu'il venait de cocher. On redessine
     au tour suivant. */
  var enAttente = false;
  function redessine(etCalcule){
    if (enAttente) return;
    enAttente = true;
    /* Le redessin remplace le HTML : sans cela, qui navigue au clavier perd
       le focus a chaque case cochee et ne peut plus avancer. */
    var a = document.activeElement;
    var repere = a && a.getAttribute
      ? (a.getAttribute("data-o") ? '[data-o="' + a.getAttribute("data-o") + '"]'
        : a.id ? "#" + a.id : null)
      : null;
    setTimeout(function(){
      enAttente = false;
      dessineOptions();
      if (etCalcule) calcule();
      if (repere){
        var r = el("opts").querySelector(repere) || document.querySelector(repere);
        if (r && r.focus) r.focus();
      }
    }, 0);
  }

  /* Un seul ecouteur sur le bloc, qui survit aux redessins. */
  function brancheOptions(){
    var c = el("opts");
    c.addEventListener("change", function(e){
      var t = e.target;
      if (t.matches("input[data-q]")){
        var k = t.getAttribute("data-q");
        if (PRIS[k]) PRIS[k].q = Math.max(1, parseInt(t.value, 10) || 1);
        redessine(true); return;
      }
      if (t.matches("input[data-g]")){
        var kg = t.getAttribute("data-g");
        if (PRIS[kg])
          PRIS[kg].gens = Math.max(1, Math.min(monde(), parseInt(t.value, 10) || 1));
        redessine(true); return;
      }
      if (t.matches("input[data-mt]")){
        MIENS[+t.getAttribute("data-mt")].texte = t.value; return;
      }
      if (t.matches("select[data-mtar]")){
        MIENS[+t.getAttribute("data-mtar")].tarif = t.value;
        redessine(false); return;
      }
      if (t.matches("input[data-mmt]")){
        MIENS[+t.getAttribute("data-mmt")].montant = t.value; return;
      }
      if (t.matches("input[data-mav]")){
        MIENS[+t.getAttribute("data-mav")].avance = t.checked; return;
      }
      if (t.matches("select[data-sq]")){
        SPEC[+t.getAttribute("data-sq")].quoi = t.value; return;
      }
      if (t.matches("input[data-sd]")){
        SPEC[+t.getAttribute("data-sd")].detail = t.value;
      }
    });
    c.addEventListener("input", function(e){
      var t = e.target;
      if (t.matches("input[data-mt]")) MIENS[+t.getAttribute("data-mt")].texte = t.value;
      if (t.matches("input[data-sd]")) SPEC[+t.getAttribute("data-sd")].detail = t.value;
      if (t.matches("input[data-mmt]")) MIENS[+t.getAttribute("data-mmt")].montant = t.value;
    });
    c.addEventListener("click", function(e){
      /* La case et son libelle : une seule lecture du clic, et c'est nous
         qui tenons l'etat. Sans preventDefault le navigateur cocherait de
         son cote, puis le redessin la recocherait depuis l'etat, et un clic
         sur le libelle produirait deux basculements. */
      var tete = e.target.closest(".opt > .tete");
      if (tete){
        var cb = tete.querySelector("input[data-o]");
        if (cb){
          e.preventDefault();
          var id = cb.getAttribute("data-o");
          PRIS[id] = PRIS[id] ? null : { q: 1, jours: null };
          if (!PRIS[id] && OUVERT === id) OUVERT = null;
          redessine(true);
        }
        return;
      }
      var b = e.target.closest("button");
      if (!b) return;
      var v;
      if ((v = b.getAttribute("data-ouvre")) !== null){
        OUVERT = OUVERT === v ? null : v; redessine(false); return;
      }
      if ((v = b.getAttribute("data-tout")) !== null){
        if (PRIS[v]) PRIS[v].jours = null; redessine(true); return;
      }
      if ((v = b.getAttribute("data-rien")) !== null){
        if (PRIS[v]) PRIS[v].jours = [];  redessine(true); return;
      }
      if ((v = b.getAttribute("data-jour")) !== null){
        var p = v.split("|"), id = p[0], j = p[1];
        if (!PRIS[id]) return;
        /* Une seule regle pour la carte et pour la grille, sinon les deux
           divergent des qu'une prestation se compte a la seance. */
        var deja = PRIS[id].jours
          ? PRIS[id].jours.indexOf(j) >= 0
          : !parSeance(id);
        poseJour("o:" + id, j, !deja);
        redessine(true); return;
      }
      if ((v = b.getAttribute("data-mj")) !== null){
        var q = v.split("|"), i = +q[0], jj = q[1];
        var kk = MIENS[i].jours.indexOf(jj);
        if (kk >= 0) MIENS[i].jours.splice(kk, 1); else MIENS[i].jours.push(jj);
        MIENS[i].jours.sort();
        redessine(false); return;
      }
      if ((v = b.getAttribute("data-mo")) !== null){
        MIENS.splice(+v, 1); redessine(false); return;
      }
      if ((v = b.getAttribute("data-so")) !== null){
        SPEC.splice(+v, 1); redessine(false); return;
      }
      if (b.id === "spec-plus"){
        SPEC.push({ quoi: DEMANDES[0], detail: "" }); dessineOptions();
        var y = el("opts").querySelectorAll("input[data-sd]");
        if (y.length) y[y.length - 1].focus();
        return;
      }
      if (b.id === "mien-plus"){
        MIENS.push({ texte: "", jours: [], tarif: "devis", montant: "", avance: false });
        dessineOptions();
        var x = el("opts").querySelectorAll("input[data-mt]");
        if (x.length) x[x.length - 1].focus();
      }
    });
  }

  /* Ce que le client a compose, en clair, pour la demande et pour l'equipe. */
  function ditTarif(m){
    if (m.tarif === "gratuit")       return "free";
    if (m.tarif === "dehors")        return "they arrange and pay it themselves";
    if (m.tarif === "participation" || m.tarif === "paye"){
      var q = m.tarif === "paye" ? "paid" : "with a contribution";
      if (m.montant) q += ", " + sou(m.montant) + " THB";
      if (m.avance) q += ", paid before arrival";
      return q;
    }
    return "for us to quote";
  }
  function monPlan(){
    var out = [];
    for (var i = 0; i < MIENS.length; i++){
      var m = MIENS[i];
      if (!m.texte.trim()) continue;
      out.push("- " + m.texte.trim() +
        (m.jours.length ? " (" + m.jours.map(puce).join(", ") + ")" : "") +
        " [" + ditTarif(m) + "]");
    }
    return out;
  }
  function mesVoeux(){
    var out = [];
    for (var i = 0; i < SPEC.length; i++){
      var x = SPEC[i];
      if (!x.quoi) continue;
      out.push("- " + x.quoi + (x.detail.trim() ? " : " + x.detail.trim() : ""));
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
      if (!PRIS[o.id]) continue;
      if (o.choix === "jours"){
        out.push({ cle: "o:" + o.id, nom: o.nom,
                   jours: PRIS[o.id].jours || nuitsDuSejour().slice() });
      } else if (o.choix === "sessions-jours"){
        /* Un massage pose un jour precis se voit dans la semaine comme le
           reste. Sans jour marque, la ligne est vide : la prestation existe,
           elle n'a pas encore sa place. */
        out.push({ cle: "o:" + o.id, nom: o.nom, jours: PRIS[o.id].jours || [] });
      }
    }
    for (var k = 0; k < MIENS.length; k++){
      if (!MIENS[k].texte.trim()) continue;
      out.push({ cle: "m:" + k, nom: MIENS[k].texte.trim(), jours: MIENS[k].jours });
    }
    return out;
  }

  function parSeance(id){
    for (var i = 0; i < OPTIONS.length; i++)
      if (OPTIONS[i].id === id) return OPTIONS[i].choix === "sessions-jours";
    return false;
  }

  function poseJour(cle, j, on){
    var p = cle.split(":");
    if (p[0] === "o"){
      var id = p[1];
      if (!PRIS[id]) return;
      var seance = parSeance(id);
      var liste = PRIS[id].jours ? PRIS[id].jours.slice()
                : seance ? [] : nuitsDuSejour();
      var k = liste.indexOf(j);
      if (on && k < 0) liste.push(j);
      if (!on && k >= 0) liste.splice(k, 1);
      liste.sort();
      if (seance){
        /* Un jour marque vaut une seance : le compte suit la semaine, le
           client n'a pas a tenir deux chiffres en accord. */
        PRIS[id].jours = liste;
        if (liste.length) PRIS[id].q = liste.length;
      } else {
        PRIS[id].jours = liste.length === nuitsDuSejour().length ? null : liste;
      }
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
      if (o.choix === "sessions-jours"){
        var j = PRIS[o.id].jours;
        if (j && j.length) continue;          /* elle est dans la grille */
        out.push((PRIS[o.id].q || 1) + " \u00d7 " + o.nom + ", no day set yet");
      } else out.push(o.nom);
    }
    return out;
  }

  function dessinePlan(){
    var c = el("plan");
    if (!c) return;
    if (!INSCRIT){
      c.innerHTML = verrou("Your week, laid out day by day",
        "Lay out a typical week, copy it onto the weeks that follow, and see " +
        "the whole stay take shape. It opens as soon as you sign in.");
      return;
    }
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
    if (!t || !m) return INSCRIT ? sou(thb) + " THB" : masque(sou(thb) + " THB");
    var v = thb / t;
    var texte = c === "BTC" ? v.toFixed(4)
              : c === "THB" || c === "JPY" ? sou(v)   /* ni l'un ni l'autre ne compte de centimes */
              : v >= 1000 ? sou(v)
              : v.toFixed(2);
    var sortie = m.signe + " " + texte + (c === "THB" ? "" : "");
    return INSCRIT ? sortie : masque(sortie);
  }

  /* ---------- le devis ---------- */
  function calcule(){
    var a = el("a").value, d = el("d").value;
    var p = monde();
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
    /* Une prestation qui ne prend pas tout le monde a la fois le dit : sinon
       le client lit "12 guests" au-dessus d'un total calcule sur quatre. */
    if (l.unite === 2 && l.gens) bout.push(l.gens + (l.gens > 1 ? " guests" : " guest"));
    else if (l.unite === 2) bout.push(p + " guests");
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
    if (!INSCRIT)
      return verrou("The line by line detail",
        "Every night, every season and every extra, priced one by one. " +
        "It opens as soon as you sign in.");
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

    h.push('<div class="chiffre' + (INSCRIT ? "" : " flou") + '"><span>' +
      v.nuits + " nights, " + v.personnes + ' guests</span><b>' +
      enMonnaie(v.total) + "</b></div>");
    if (!INSCRIT)
      h.push('<div class="invite"><p><b>You are looking as a visitor.</b> ' +
        "The dates, the calendar and everything you can add are open to you. " +
        "The prices are not, and neither is sending us your dates.</p>" +
        '<button type="button" class="bt plein" data-entre>' +
        "Sign in and see the real figures</button></div>");
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
    if (!INSCRIT){
      dit.className = "dit non";
      dit.textContent = "Sign in first and we will have a name to answer to.";
      rouvre();
      return;
    }
    var a = el("a").value, d = el("d").value;
    if (!a || !d || d <= a){
      dit.className = "dit non"; dit.textContent = "Please choose your dates first."; return;
    }
    var corps = {
      arrivee: a, depart: d,
      personnes: monde(),
      options: quantites(),
      nom: el("q-nom").value.trim(),
      organisation: el("q-org").value.trim(),
      courriel: el("q-mail").value.trim(),
      tel: el("q-tel").value.trim(),
      pays: el("q-pays").value.trim(),
      message: ("Event type: " + el("q-type").value + "\n\n" + el("q-msg").value).trim()
    };
    var voeux = mesVoeux();
    if (voeux.length)
      corps.message += "\n\nSpecial requests:\n" + voeux.join("\n");
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
