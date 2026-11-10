// Gráfico "Evolución de la reunión": una línea por variable con el promedio del grupo en el tiempo.
// Se dibuja con SVG, sin librerías. Los datos vienen de GET /status/{salaId}/historial
// y se van sumando con cada respuesta de POST /status/{salaId}/valores.

const SERIES = [
  { letra: 'X', nombre: 'Stress', color: '#2a78d6' },
  { letra: 'Y', nombre: 'Perdido', color: '#eb6834' },
  { letra: 'Z', nombre: 'Falta contexto', color: '#1baf7a' },
  { letra: 'W', nombre: 'Devuelta', color: '#eda100' },
];
const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_PUNTOS = 120; // 30 minutos a un punto cada 15 s

const Grafico = {
  puntos: [],

  // Reemplaza todos los puntos (al entrar a la reunión o al tocar Actualizar)
  cargar(puntos) {
    this.puntos = puntos.map((p) => ({ ...p, fecha: new Date(p.fecha) })).filter((p) => p.participantes > 0);
    this.dibujar();
  },

  // Suma un punto nuevo (con cada respuesta del POST), como máximo uno cada 15 s
  agregar(promedio) {
    if (!promedio.participantes) return;
    const ultimo = this.puntos[this.puntos.length - 1];
    const ahora = new Date();
    if (ultimo && ahora - ultimo.fecha < 15000) {
      this.puntos[this.puntos.length - 1] = { ...promedio, fecha: ultimo.fecha }; // actualiza el último
    } else {
      this.puntos.push({ ...promedio, fecha: ahora });
    }
    this.puntos = this.puntos.slice(-MAX_PUNTOS);
    this.dibujar();
  },

  vaciar() {
    this.puntos = [];
    this.dibujar();
  },

  dibujar() {
    const contenedor = document.querySelector('#grafico');
    const tooltip = document.querySelector('#grafico-tooltip');
    contenedor.querySelectorAll('svg, .grafico-vacio').forEach((n) => n.remove());
    tooltip.hidden = true;
    this.dibujarLeyenda();
    this.dibujarTabla();

    if (!this.puntos.length) {
      const vacio = document.createElement('div');
      vacio.className = 'grafico-vacio';
      vacio.textContent = 'Todavía no hay datos. El gráfico se completa a medida que el grupo marca su estado.';
      contenedor.prepend(vacio);
      return;
    }

    const ancho = contenedor.clientWidth;
    const alto = contenedor.clientHeight;
    const angosto = ancho < 520;
    const m = { arriba: 10, derecha: angosto ? 12 : 128, abajo: 26, izquierda: 28 };
    const w = ancho - m.izquierda - m.derecha;
    const h = alto - m.arriba - m.abajo;

    // Eje X: desde el primer punto (o 5 minutos atrás como mínimo) hasta el último
    const fin = this.puntos[this.puntos.length - 1].fecha.getTime();
    const inicio = Math.min(this.puntos[0].fecha.getTime(), fin - 5 * 60 * 1000);
    const x = (fecha) => m.izquierda + ((fecha.getTime() - inicio) / (fin - inicio)) * w;
    const y = (valor) => m.arriba + h - (valor / 10) * h;

    const svg = crear('svg', { viewBox: `0 0 ${ancho} ${alto}`, role: 'img', 'aria-label': this.descripcion() });

    // Grilla horizontal y eje Y (0 a 10)
    const grilla = crear('g', { class: 'grilla' });
    const ejeY = crear('g', { class: 'eje' });
    [0, 2, 4, 6, 8, 10].forEach((v) => {
      grilla.append(crear('line', { x1: m.izquierda, x2: m.izquierda + w, y1: y(v), y2: y(v) }));
      ejeY.append(texto(String(v), { x: m.izquierda - 8, y: y(v) + 4, 'text-anchor': 'end' }));
    });
    svg.append(grilla, ejeY);

    // Eje X: horas repartidas (menos marcas en pantallas angostas)
    const ejeX = crear('g', { class: 'eje' });
    const tramos = angosto ? 2 : 3;
    for (let i = 0; i <= tramos; i++) {
      const fecha = new Date(inicio + ((fin - inicio) * i) / tramos);
      ejeX.append(texto(hora(fecha), { x: x(fecha), y: alto - 6, 'text-anchor': i === 0 ? 'start' : i === tramos ? 'end' : 'middle' }));
    }
    svg.append(ejeX);

    // Una línea por variable
    const ultimo = this.puntos[this.puntos.length - 1];
    SERIES.forEach((s) => {
      const d = this.puntos.map((p, i) => `${i ? 'L' : 'M'}${x(p.fecha).toFixed(1)},${y(p[s.letra]).toFixed(1)}`).join(' ');
      svg.append(crear('path', { class: 'serie', d, stroke: s.color }));
      // Punto final con anillo del color de fondo
      svg.append(crear('circle', { cx: x(ultimo.fecha), cy: y(ultimo[s.letra]), r: 4.5, fill: s.color, stroke: '#fff', 'stroke-width': 2 }));
    });

    // Etiquetas al final de cada línea (nombre + valor), separadas para que no se pisen
    if (!angosto) {
      const etiquetas = SERIES.map((s) => ({ ...s, y: y(ultimo[s.letra]) + 4 })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < etiquetas.length; i++) {
        if (etiquetas[i].y - etiquetas[i - 1].y < 15) etiquetas[i].y = etiquetas[i - 1].y + 15;
      }
      const exceso = etiquetas[etiquetas.length - 1].y - (m.arriba + h + 4);
      if (exceso > 0) etiquetas.forEach((e) => (e.y -= exceso));
      etiquetas.forEach((e) => {
        const t = texto(`${e.nombre} `, { class: 'etiqueta-linea', x: x(ultimo.fecha) + 10, y: e.y });
        const valor = document.createElementNS(SVG_NS, 'tspan');
        valor.textContent = ultimo[e.letra].toFixed(1);
        t.append(valor);
        svg.append(t);
      });
    }

    // Capa de hover: línea vertical + tooltip con los 4 valores
    const cruz = crear('line', { class: 'cruz', y1: m.arriba, y2: m.arriba + h, visibility: 'hidden' });
    const marcas = SERIES.map((s) => crear('circle', { r: 4, fill: s.color, stroke: '#fff', 'stroke-width': 2, visibility: 'hidden' }));
    const zona = crear('rect', { x: m.izquierda, y: m.arriba, width: w + 8, height: h, fill: 'transparent' });
    svg.append(cruz, ...marcas, zona);

    const mover = (evento) => {
      const caja = svg.getBoundingClientRect();
      const cx = ((evento.touches ? evento.touches[0].clientX : evento.clientX) - caja.left) * (ancho / caja.width);
      let cercano = this.puntos[0];
      this.puntos.forEach((p) => {
        if (Math.abs(x(p.fecha) - cx) < Math.abs(x(cercano.fecha) - cx)) cercano = p;
      });
      const px = x(cercano.fecha);
      cruz.setAttribute('x1', px);
      cruz.setAttribute('x2', px);
      cruz.setAttribute('visibility', 'visible');
      marcas.forEach((c, i) => {
        c.setAttribute('cx', px);
        c.setAttribute('cy', y(cercano[SERIES[i].letra]));
        c.setAttribute('visibility', 'visible');
      });
      tooltip.innerHTML =
        `<strong>${hora(cercano.fecha, true)} · ${cercano.participantes} participante${cercano.participantes === 1 ? '' : 's'}</strong>` +
        SERIES.map((s) => `<div><i style="background:${s.color}"></i><span>${s.nombre}</span><b>${cercano[s.letra].toFixed(1)}</b></div>`).join('');
      tooltip.hidden = false;
      const izquierda = (px / ancho) * caja.width;
      const anchoTip = tooltip.offsetWidth;
      tooltip.style.left = `${izquierda + 14 + anchoTip > caja.width ? izquierda - anchoTip - 14 : izquierda + 14}px`;
    };
    const ocultar = () => {
      tooltip.hidden = true;
      cruz.setAttribute('visibility', 'hidden');
      marcas.forEach((c) => c.setAttribute('visibility', 'hidden'));
    };
    zona.addEventListener('mousemove', mover);
    zona.addEventListener('touchstart', mover, { passive: true });
    zona.addEventListener('touchmove', mover, { passive: true });
    zona.addEventListener('mouseleave', ocultar);
    zona.addEventListener('touchend', ocultar);

    contenedor.prepend(svg);
  },

  dibujarLeyenda() {
    const ultimo = this.puntos[this.puntos.length - 1];
    document.querySelector('#leyenda-grafico').innerHTML = SERIES.map(
      (s) => `<li><i style="background:${s.color}"></i>${s.nombre}${ultimo ? ` <b>${ultimo[s.letra].toFixed(1)}</b>` : ''}</li>`
    ).join('');
  },

  // Los mismos datos en una tabla (accesible y útil para revisar los números)
  dibujarTabla() {
    const filas = [...this.puntos].reverse().map(
      (p) => `<tr><td>${hora(p.fecha, true)}</td>${SERIES.map((s) => `<td>${p[s.letra].toFixed(1)}</td>`).join('')}<td>${p.participantes}</td></tr>`
    );
    document.querySelector('#tabla-historial').innerHTML = filas.length
      ? `<table><thead><tr><th>Hora</th>${SERIES.map((s) => `<th>${s.nombre}</th>`).join('')}<th>Participantes</th></tr></thead><tbody>${filas.join('')}</tbody></table>`
      : '<p class="sub">Todavía no hay datos.</p>';
  },

  descripcion() {
    const ultimo = this.puntos[this.puntos.length - 1];
    return `Evolución del promedio de la reunión. Último valor: ${SERIES.map((s) => `${s.nombre} ${ultimo[s.letra].toFixed(1)}`).join(', ')}.`;
  },
};

function crear(etiqueta, atributos) {
  const nodo = document.createElementNS(SVG_NS, etiqueta);
  Object.entries(atributos).forEach(([k, v]) => nodo.setAttribute(k, v));
  return nodo;
}
function texto(contenido, atributos) {
  const nodo = crear('text', atributos);
  nodo.textContent = contenido;
  return nodo;
}
function hora(fecha, conSegundos = false) {
  return fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, ...(conSegundos && { second: '2-digit' }) });
}

// Si cambia el tamaño de la ventana, se vuelve a dibujar
let esperaRedibujo;
window.addEventListener('resize', () => {
  clearTimeout(esperaRedibujo);
  esperaRedibujo = setTimeout(() => Grafico.dibujar(), 150);
});
