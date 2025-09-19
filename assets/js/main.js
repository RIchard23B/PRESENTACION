  // Interactive behaviour
  (function(){
    const svg = document.getElementById('svgmap');
    const tooltip = document.getElementById('tooltip');
    const info = document.getElementById('panelDesc');
    const panelStep = document.getElementById('panelStep');
    const playBtn = document.getElementById('playBtn');
    const resetBtn = document.getElementById('resetBtn');
    const flowDot = document.getElementById('flowDot');
    let animId = null;

    // select all area groups
    const areas = Array.from(svg.querySelectorAll('.area-group'));

    // helper to get screen position of an SVG element
    function svgPoint(x,y){
      const pt = svg.createSVGPoint();
      pt.x = x; pt.y = y;
      const ctm = svg.getScreenCTM();
      return pt.matrixTransform(ctm);
    }

    // show tooltip near area
    function showTooltipFor(el){
      const bbox = el.getBBox();
      const p = svgPoint(bbox.x + bbox.width/2, bbox.y);
      tooltip.style.left = (p.x + 12) + 'px';
      tooltip.style.top = (p.y - 8) + 'px';
      tooltip.textContent = el.dataset.step || 'Área';
      tooltip.classList.add('show');
      tooltip.setAttribute('aria-hidden','false');
    }
    function hideTooltip(){ tooltip.classList.remove('show'); tooltip.setAttribute('aria-hidden','true'); }

    // hover handlers
    areas.forEach(g=>{
      g.addEventListener('mouseenter', (ev)=>{
        g.classList.add('hovered');
        showTooltipFor(g);
      });
      g.addEventListener('mouseleave', (ev)=>{
        g.classList.remove('hovered');
        hideTooltip();
      });
      g.addEventListener('click', (ev)=>{
        // populate right panel
        const step = g.dataset.step || 'Estación';
        const type = g.dataset.type || 'operación';
        info.textContent = step;
        panelStep.style.display = 'block';
        panelStep.innerHTML = `<strong>Tipo:</strong> ${type} <br/><strong>Descripción:</strong> ${step} <br/><em>Recomendación:</em> registrar tiempo y temperatura si aplica.`;
        // flash highlight
        g.classList.add('hovered');
        setTimeout(()=>g.classList.remove('hovered'), 900);
      });
    });

    // Play animation: follow composed path by sampling points from the flow arrows group
    function parsePathSegments(){
      const group = svg.getElementById ? svg.getElementById('flow-arrows') : svg.querySelector('#flow-arrows');
      const paths = Array.from(group.querySelectorAll('path'));
      // combine path lengths and points
      let segments = [];
      paths.forEach(p=>{
        const len = p.getTotalLength();
        segments.push({path:p, len});
      });
      return segments;
    }

    // build an array of points along the multi-path route
    function buildRoutePoints(segments, steps=700){
      // produce 'steps' number samples distributed across segments proportional to length
      const totalLen = segments.reduce((s,seg)=>s+seg.len,0);
      const points = [];
      let acc = 0;
      segments.forEach(seg=>{
        const n = Math.max(10, Math.round((seg.len/totalLen)*steps));
        for(let i=0;i<n;i++){
          const t = i/(n-1);
          try {
            const pt = seg.path.getPointAtLength(t*seg.len);
            points.push({x:pt.x,y:pt.y});
          } catch(e){}
        }
        acc += seg.len;
      });
      return points;
    }

    // animate dot along route
    let routePoints = null;
    function playFlow(){
      if (animId) cancelAnimationFrame(animId);
      const segments = parsePathSegments();
      routePoints = buildRoutePoints(segments, 700);
      if (!routePoints.length) return;
      flowDot.setAttribute('visibility','visible');
      let idx = 0;
      const total = routePoints.length;
      const speed = 2; // pixels per frame approx (controls smoothness)
      function step(){
        const p = routePoints[idx];
        flowDot.setAttribute('cx', p.x);
        flowDot.setAttribute('cy', p.y);
        idx++;
        if(idx < total) animId = requestAnimationFrame(step);
        else { flowDot.setAttribute('visibility','hidden'); animId = null; }
      }
      step();
    }

    function resetMap(){
      if(animId) cancelAnimationFrame(animId);
      flowDot.setAttribute('visibility','hidden');
      info.textContent = 'Pasa el cursor sobre una zona del mapa para ver la descripción. Haz click para fijar el detalle aquí.';
      panelStep.style.display = 'none';
    }

    playBtn.addEventListener('click', playFlow);
    resetBtn.addEventListener('click', resetMap);

    // simple download svg as PNG
    document.getElementById('downloadBtn').addEventListener('click', async ()=>{
      const svgEl = document.getElementById('svgmap');
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgEl);
      const blob = new Blob([source], {type:'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgEl.viewBox.baseVal.width || 1200;
        canvas.height = svgEl.viewBox.baseVal.height || 700;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0);
        URL.revokeObjectURL(url);
        const png = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = png;
        a.download = 'mapa_planta_chocolate.png';
        a.click();
      };
      img.src = url;
    });

    // zoom to fit basic
    document.getElementById('zoomIn').addEventListener('click', ()=>{
      svg.setAttribute('viewBox','100 0 1000 700');
    });

    // init
    resetMap();

    // accessibility: hide tooltip on scroll
    document.getElementById('map').addEventListener('scroll', hideTooltip);
  })();
