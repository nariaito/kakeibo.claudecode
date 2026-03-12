// charts.js — Chart.js wrappers

const Charts = {
  pie: null,
  bar: null,

  donut(canvasId, labels, values, colors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.pie) { this.pie.destroy(); this.pie = null; }
    if (!values.some(v => v > 0)) {
      ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
      return;
    }
    this.pie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: c => ` ${c.label}: ¥${c.parsed.toLocaleString()}`,
            },
          },
        },
      },
    });
  },

  stacked(canvasId, labels, datasets) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.bar) { this.bar.destroy(); this.bar = null; }
    this.bar = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
          y: {
            stacked: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { size: 10 },
              callback: v => v >= 1000 ? `¥${(v/1000).toFixed(0)}k` : `¥${v}`,
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: c => ` ${c.dataset.label}: ¥${c.parsed.y.toLocaleString()}`,
            },
          },
        },
      },
    });
  },
};
