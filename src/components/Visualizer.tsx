
import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !analyser) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match container
    const resizeCanvas = () => {
      const visualizerContainer = canvas.parentElement;
      if (!visualizerContainer) return;
      
      const { width, height } = visualizerContainer.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const bufferLength = analyser.frequencyBinCount;
    
    const draw = () => {
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dynamic gradient based on audio intensity
      const intensity = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length / 255;
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, `hsl(${280 - intensity * 40}, 80%, 60%)`);
      gradient.addColorStop(0.5, `hsl(${260 - intensity * 30}, 85%, 65%)`);
      gradient.addColorStop(1, `hsl(${240 - intensity * 20}, 90%, 70%)`);
      
      // Draw circular visualizer
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8 * (0.8 + intensity * 0.2);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;
      
      let angle = 0;
      const sliceWidth = (2 * Math.PI) / bufferLength;
      
      // Draw circular bars
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const normValue = value / 255;
        const barHeight = (radius * 0.4) * normValue + radius * 0.1;
        
        const x1 = centerX + (radius - 5) * Math.cos(angle);
        const y1 = centerY + (radius - 5) * Math.sin(angle);
        const x2 = centerX + (radius - barHeight) * Math.cos(angle);
        const y2 = centerY + (radius - barHeight) * Math.sin(angle);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        angle += sliceWidth;
      }
      
      // Draw inner circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.1 * (1 + intensity), 0, 2 * Math.PI);
      ctx.fillStyle = `hsla(${280 - intensity * 40}, 80%, 60%, ${0.2 + intensity * 0.4})`;
      ctx.fill();
      
      // Draw outer circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = `hsla(${260 - intensity * 30}, 85%, 65%, 0.2)`;
      ctx.stroke();
      
      // Add glow effect
      ctx.shadowColor = `hsla(${260 - intensity * 30}, 85%, 65%, 0.5)`;
      ctx.shadowBlur = 15 * intensity;
      
      // Add particles
      const particleCount = Math.floor(20 * intensity);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      
      for (let i = 0; i < particleCount; i++) {
        const particleAngle = Math.random() * Math.PI * 2;
        const particleDistance = Math.random() * radius * 1.2;
        const particleSize = Math.random() * 3 + 1;
        
        const px = centerX + particleDistance * Math.cos(particleAngle);
        const py = centerY + particleDistance * Math.sin(particleAngle);
        
        ctx.beginPath();
        ctx.arc(px, py, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    
    draw();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [analyser]);
  
  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-full"
    />
  );
};

export default Visualizer;
