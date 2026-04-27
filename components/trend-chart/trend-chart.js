// components/trend-chart/trend-chart.js
const COLORS = [
  '#e94560', '#4caf50', '#2196f3', '#ff9800', '#9c27b0',
  '#00bcd4', '#795548', '#607d8b', '#f44336', '#3f51b5',
];

Component({
  properties: {
    series: { type: Array, value: [] },
    labels: { type: Array, value: [] },
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 200,
  },

  lifetimes: {
    attached() {
      const sysInfo = wx.getSystemInfoSync();
      const canvasWidth = sysInfo.windowWidth - 32;
      const canvasHeight = Math.round(canvasWidth * 0.6);
      this.setData({ canvasWidth, canvasHeight });
    },
  },

  observers: {
    'series, labels'() {
      if (this.data.series.length > 0 && this.data.labels.length > 1) {
        setTimeout(() => this.drawChart(), 100);
      }
    },
  },

  methods: {
    drawChart() {
      const query = this.createSelectorQuery();
      query.select('#trendCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res || !res[0] || !res[0].node) return;

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const { canvasWidth, canvasHeight } = this.data;

        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        ctx.scale(dpr, dpr);

        this._draw(ctx, canvasWidth, canvasHeight);
      });
    },

    _draw(ctx, w, h) {
      const { series, labels } = this.data;
      const padding = { top: 20, right: 16, bottom: 32, left: 48 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      // 清空
      ctx.clearRect(0, 0, w, h);

      // 计算 Y 轴范围
      let minY = 0, maxY = 0;
      series.forEach(s => {
        s.data.forEach(v => {
          if (v < minY) minY = v;
          if (v > maxY) maxY = v;
        });
      });
      // 留出 10% 边距
      const range = maxY - minY || 100;
      minY = minY - range * 0.1;
      maxY = maxY + range * 0.1;

      const xStep = chartW / (labels.length - 1);
      const yScale = chartH / (maxY - minY);

      const toX = (i) => padding.left + i * xStep;
      const toY = (v) => padding.top + (maxY - v) * yScale;

      // 绘制网格线和 Y 轴标签
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.fillStyle = '#a0a0b0';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const gridCount = 4;
      for (let i = 0; i <= gridCount; i++) {
        const val = minY + (maxY - minY) * (i / gridCount);
        const y = toY(val);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
        ctx.fillText(Math.round(val).toString(), padding.left - 6, y);
      }

      // 绘制零线（如果在范围内）
      if (minY < 0 && maxY > 0) {
        const zeroY = toY(0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(w - padding.right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 绘制 X 轴标签
      ctx.fillStyle = '#a0a0b0';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      labels.forEach((label, i) => {
        // 标签过多时只显示部分
        if (labels.length > 10 && i % Math.ceil(labels.length / 8) !== 0 && i !== labels.length - 1) return;
        ctx.fillText(label, toX(i), h - padding.bottom + 8);
      });

      // 绘制每条曲线
      series.forEach((s, si) => {
        const color = s.color || COLORS[si % COLORS.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        s.data.forEach((v, i) => {
          const x = toX(i);
          const y = toY(v);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 绘制数据点
        s.data.forEach((v, i) => {
          const x = toX(i);
          const y = toY(v);
          ctx.fillStyle = '#1a1a2e';
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      });
    },
  },
});
