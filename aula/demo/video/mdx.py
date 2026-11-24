# separación de voz con UVR MDX-Net (Voc_FT) en numpy + onnxruntime
import numpy as np, onnxruntime as ort, subprocess, sys, wave
NFFT, HOP, DIMF, DIMT, COMP = 7680, 1024, 3072, 256, 1.021
CH = HOP*(DIMT-1); TRIM = NFFT//2; GEN = CH-2*TRIM
win = np.hanning(NFFT+1)[:-1].astype(np.float32)  # periódica
def leer(f):
    raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-f','f32le','-ac','2','-ar','44100','-'],capture_output=True).stdout
    return np.frombuffer(raw,np.float32).reshape(-1,2).T.copy()
def stft(x):  # x: (2, n) -> (2, F, T) complejo, center=True reflect
    p = NFFT//2; x = np.pad(x, ((0,0),(p,p)), mode='reflect'); T = 1 + (x.shape[1]-NFFT)//HOP
    idx = np.arange(NFFT)[None,:] + HOP*np.arange(T)[:,None]
    fr = x[:, idx] * win  # (2, T, NFFT)
    return np.fft.rfft(fr, axis=-1).transpose(0,2,1)
def istft(S, n):  # S: (2, F, T)
    fr = np.fft.irfft(S.transpose(0,2,1), n=NFFT, axis=-1) * win  # (2,T,NFFT)
    T = fr.shape[1]; L = NFFT + HOP*(T-1); y = np.zeros((2,L),np.float32); wsum = np.zeros(L,np.float32)
    for t in range(T): y[:, t*HOP:t*HOP+NFFT] += fr[:,t]; wsum[t*HOP:t*HOP+NFFT] += win**2
    y /= np.maximum(wsum,1e-8); p = NFFT//2; return y[:, p:p+n]
s = ort.InferenceSession('voc_ft.onnx', providers=['CPUExecutionProvider'])
mix = leer(sys.argv[1]); n = mix.shape[1]
pad = GEN - n % GEN; mp = np.concatenate([np.zeros((2,TRIM),np.float32), mix, np.zeros((2,pad),np.float32), np.zeros((2,TRIM),np.float32)],1)
out = []
for i in range(0, n+pad, GEN):
    w = mp[:, i:i+CH]; S = stft(w)[:, :DIMF, :]  # (2,3072,256)
    inp = np.stack([S[0].real, S[0].imag, S[1].real, S[1].imag])[None].astype(np.float32)
    o = s.run(None, {'input': inp})[0][0]
    Sp = np.zeros((2, NFFT//2+1, DIMT), np.complex64); Sp[0,:DIMF] = o[0]+1j*o[1]; Sp[1,:DIMF] = o[2]+1j*o[3]
    out.append(istft(Sp, CH)[:, TRIM:-TRIM]); print('.', end='', flush=True)
voc = np.concatenate(out,1)[:, :n] * COMP
for nombre, y in [('voz.wav', voc), ('musica_suno.wav', mix - voc)]:
    y = np.clip(y, -1, 1); w = wave.open(nombre,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(44100); w.writeframes((y.T*32767).astype(np.int16).tobytes()); w.close()
print('\nlisto', n/44100)
