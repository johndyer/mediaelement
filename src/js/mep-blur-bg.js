!function(a){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=a();else if("function"==typeof define&&define.amd)define([],a);else{var b;b="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,b.StackBlur=a()}}(function(){return function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);var j=new Error("Cannot find module '"+g+"'");throw j.code="MODULE_NOT_FOUND",j}var k=c[g]={exports:{}};b[g][0].call(k.exports,function(a){var c=b[g][1][a];return e(c?c:a)},k,k.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b,c){function d(a,b,c,d){if("string"==typeof a)var a=document.getElementById(a);else if("undefined"!=typeof HTMLImageElement&&!a instanceof HTMLImageElement)return;var e=a.naturalWidth,g=a.naturalHeight;if("string"==typeof b)var b=document.getElementById(b);else if("undefined"!=typeof HTMLCanvasElement&&!b instanceof HTMLCanvasElement)return;b.style.width=e+"px",b.style.height=g+"px",b.width=e,b.height=g;var i=b.getContext("2d");i.clearRect(0,0,e,g),i.drawImage(a,0,0),isNaN(c)||c<1||(d?f(b,0,0,e,g,c):h(b,0,0,e,g,c))}function e(a,b,c,d,e){if("string"==typeof a)var a=document.getElementById(a);else if("undefined"!=typeof HTMLCanvasElement&&!a instanceof HTMLCanvasElement)return;var f,g=a.getContext("2d");try{try{f=g.getImageData(b,c,d,e)}catch(h){throw new Error("unable to access local image data: "+h)}}catch(h){throw new Error("unable to access image data: "+h)}return f}function f(a,b,c,d,f,h){if(!(isNaN(h)||h<1)){h|=0;var i=e(a,b,c,d,f);i=g(i,b,c,d,f,h),a.getContext("2d").putImageData(i,b,c)}}function g(a,b,c,d,e,f){var g,h,i,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H=a.data,I=f+f+1,J=d-1,K=e-1,L=f+1,M=L*(L+1)/2,N=new j,O=N;for(i=1;i<I;i++)if(O=O.next=new j,i==L)var P=O;O.next=N;var Q=null,R=null;p=o=0;var S=k[f],T=l[f];for(h=0;h<e;h++){for(y=z=A=B=q=r=s=t=0,u=L*(C=H[o]),v=L*(D=H[o+1]),w=L*(E=H[o+2]),x=L*(F=H[o+3]),q+=M*C,r+=M*D,s+=M*E,t+=M*F,O=N,i=0;i<L;i++)O.r=C,O.g=D,O.b=E,O.a=F,O=O.next;for(i=1;i<L;i++)m=o+((J<i?J:i)<<2),q+=(O.r=C=H[m])*(G=L-i),r+=(O.g=D=H[m+1])*G,s+=(O.b=E=H[m+2])*G,t+=(O.a=F=H[m+3])*G,y+=C,z+=D,A+=E,B+=F,O=O.next;for(Q=N,R=P,g=0;g<d;g++)H[o+3]=F=t*S>>T,0!=F?(F=255/F,H[o]=(q*S>>T)*F,H[o+1]=(r*S>>T)*F,H[o+2]=(s*S>>T)*F):H[o]=H[o+1]=H[o+2]=0,q-=u,r-=v,s-=w,t-=x,u-=Q.r,v-=Q.g,w-=Q.b,x-=Q.a,m=p+((m=g+f+1)<J?m:J)<<2,y+=Q.r=H[m],z+=Q.g=H[m+1],A+=Q.b=H[m+2],B+=Q.a=H[m+3],q+=y,r+=z,s+=A,t+=B,Q=Q.next,u+=C=R.r,v+=D=R.g,w+=E=R.b,x+=F=R.a,y-=C,z-=D,A-=E,B-=F,R=R.next,o+=4;p+=d}for(g=0;g<d;g++){for(z=A=B=y=r=s=t=q=0,o=g<<2,u=L*(C=H[o]),v=L*(D=H[o+1]),w=L*(E=H[o+2]),x=L*(F=H[o+3]),q+=M*C,r+=M*D,s+=M*E,t+=M*F,O=N,i=0;i<L;i++)O.r=C,O.g=D,O.b=E,O.a=F,O=O.next;for(n=d,i=1;i<=f;i++)o=n+g<<2,q+=(O.r=C=H[o])*(G=L-i),r+=(O.g=D=H[o+1])*G,s+=(O.b=E=H[o+2])*G,t+=(O.a=F=H[o+3])*G,y+=C,z+=D,A+=E,B+=F,O=O.next,i<K&&(n+=d);for(o=g,Q=N,R=P,h=0;h<e;h++)m=o<<2,H[m+3]=F=t*S>>T,F>0?(F=255/F,H[m]=(q*S>>T)*F,H[m+1]=(r*S>>T)*F,H[m+2]=(s*S>>T)*F):H[m]=H[m+1]=H[m+2]=0,q-=u,r-=v,s-=w,t-=x,u-=Q.r,v-=Q.g,w-=Q.b,x-=Q.a,m=g+((m=h+L)<K?m:K)*d<<2,q+=y+=Q.r=H[m],r+=z+=Q.g=H[m+1],s+=A+=Q.b=H[m+2],t+=B+=Q.a=H[m+3],Q=Q.next,u+=C=R.r,v+=D=R.g,w+=E=R.b,x+=F=R.a,y-=C,z-=D,A-=E,B-=F,R=R.next,o+=d}return a}function h(a,b,c,d,f,g){if(!(isNaN(g)||g<1)){g|=0;var h=e(a,b,c,d,f);h=i(h,b,c,d,f,g),a.getContext("2d").putImageData(h,b,c)}}function i(a,b,c,d,e,f){var g,h,i,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D=a.data,E=f+f+1,F=d-1,G=e-1,H=f+1,I=H*(H+1)/2,J=new j,K=J;for(i=1;i<E;i++)if(K=K.next=new j,i==H)var L=K;K.next=J;var M=null,N=null;p=o=0;var O=k[f],P=l[f];for(h=0;h<e;h++){for(w=x=y=q=r=s=0,t=H*(z=D[o]),u=H*(A=D[o+1]),v=H*(B=D[o+2]),q+=I*z,r+=I*A,s+=I*B,K=J,i=0;i<H;i++)K.r=z,K.g=A,K.b=B,K=K.next;for(i=1;i<H;i++)m=o+((F<i?F:i)<<2),q+=(K.r=z=D[m])*(C=H-i),r+=(K.g=A=D[m+1])*C,s+=(K.b=B=D[m+2])*C,w+=z,x+=A,y+=B,K=K.next;for(M=J,N=L,g=0;g<d;g++)D[o]=q*O>>P,D[o+1]=r*O>>P,D[o+2]=s*O>>P,q-=t,r-=u,s-=v,t-=M.r,u-=M.g,v-=M.b,m=p+((m=g+f+1)<F?m:F)<<2,w+=M.r=D[m],x+=M.g=D[m+1],y+=M.b=D[m+2],q+=w,r+=x,s+=y,M=M.next,t+=z=N.r,u+=A=N.g,v+=B=N.b,w-=z,x-=A,y-=B,N=N.next,o+=4;p+=d}for(g=0;g<d;g++){for(x=y=w=r=s=q=0,o=g<<2,t=H*(z=D[o]),u=H*(A=D[o+1]),v=H*(B=D[o+2]),q+=I*z,r+=I*A,s+=I*B,K=J,i=0;i<H;i++)K.r=z,K.g=A,K.b=B,K=K.next;for(n=d,i=1;i<=f;i++)o=n+g<<2,q+=(K.r=z=D[o])*(C=H-i),r+=(K.g=A=D[o+1])*C,s+=(K.b=B=D[o+2])*C,w+=z,x+=A,y+=B,K=K.next,i<G&&(n+=d);for(o=g,M=J,N=L,h=0;h<e;h++)m=o<<2,D[m]=q*O>>P,D[m+1]=r*O>>P,D[m+2]=s*O>>P,q-=t,r-=u,s-=v,t-=M.r,u-=M.g,v-=M.b,m=g+((m=h+H)<G?m:G)*d<<2,q+=w+=M.r=D[m],r+=x+=M.g=D[m+1],s+=y+=M.b=D[m+2],M=M.next,t+=z=N.r,u+=A=N.g,v+=B=N.b,w-=z,x-=A,y-=B,N=N.next,o+=d}return a}function j(){this.r=0,this.g=0,this.b=0,this.a=0,this.next=null}var k=[512,512,456,512,328,456,335,512,405,328,271,456,388,335,292,512,454,405,364,328,298,271,496,456,420,388,360,335,312,292,273,512,482,454,428,405,383,364,345,328,312,298,284,271,259,496,475,456,437,420,404,388,374,360,347,335,323,312,302,292,282,273,265,512,497,482,468,454,441,428,417,405,394,383,373,364,354,345,337,328,320,312,305,298,291,284,278,271,265,259,507,496,485,475,465,456,446,437,428,420,412,404,396,388,381,374,367,360,354,347,341,335,329,323,318,312,307,302,297,292,287,282,278,273,269,265,261,512,505,497,489,482,475,468,461,454,447,441,435,428,422,417,411,405,399,394,389,383,378,373,368,364,359,354,350,345,341,337,332,328,324,320,316,312,309,305,301,298,294,291,287,284,281,278,274,271,268,265,262,259,257,507,501,496,491,485,480,475,470,465,460,456,451,446,442,437,433,428,424,420,416,412,408,404,400,396,392,388,385,381,377,374,370,367,363,360,357,354,350,347,344,341,338,335,332,329,326,323,320,318,315,312,310,307,304,302,299,297,294,292,289,287,285,282,280,278,275,273,271,269,267,265,263,261,259],l=[9,11,12,13,13,14,14,15,15,15,15,16,16,16,16,17,17,17,17,17,17,17,18,18,18,18,18,18,18,18,18,19,19,19,19,19,19,19,19,19,19,19,19,19,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24];b.exports={image:d,canvasRGBA:f,canvasRGB:h,imageDataRGBA:g,imageDataRGB:i}},{}]},{},[1])(1)});

(function($) {

  $.extend(MediaElementPlayer.prototype, {
    buildblurbg : function(player, controls, layers, media) {
      if (!player.isVideo)
        return;

	  
	 function draw(v,canvas,c,w,h,radius) {
		if(v.paused || v.ended) return false; 
		c.drawImage(v,0,0,w,h);
		StackBlur.canvasRGBA(canvas, 0, 0, w, h, radius);
		setTimeout(draw,1000/30,v,canvas,c,w,h,radius);
	}

      var
        mediaContainer = player.container.find('.mejs-mediaelement').parent();
 
   


      
        var canvasJQ = mediaContainer.closest('.canvas-video-container').find('.canvas-video'); 
		var v = media;
		var canvas = canvasJQ.get(0);
		var context = canvas.getContext('2d');
 
		var cw = canvas.clientWidth;
		var ch = canvas.clientHeight;
		 
		var radius = player.options.blurbgRadius ? player.options.blurbgRadius : 25; 
		v.addEventListener('play', function(){
			draw(this,canvas,context,cw,ch,radius);
		},false); 
 
    }
  });
})(mejs.$);
