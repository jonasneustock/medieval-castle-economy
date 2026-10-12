import {environmentKernel} from '../sim/kernels';
self.onmessage=e=>{const {request,tick,input}=e.data;self.postMessage({request,tick,result:environmentKernel(input)})};
