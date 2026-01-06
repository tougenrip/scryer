import { useState, useEffect, useRef } from 'react';
import { useAudioTracks, useAudioUpload, useAudioSync } from '@/hooks/useAudio';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Music, 
  Volume2, 
  Repeat, 
  Loader2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface MusicPlayerProps {
  campaignId: string;
  isDm: boolean;
}

export function MusicPlayer({ campaignId, isDm }: MusicPlayerProps) {
  const { tracks, loading: tracksLoading, refetch: refetchTracks } = useAudioTracks(campaignId);
  const { uploadTrack, uploading } = useAudioUpload();
  const { audioState, updateAudioState } = useAudioSync(campaignId);
  
  const [localVolume, setLocalVolume] = useState(1.0); // Local override/modifier
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync audio element with state
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Find track URL
    const activeTrack = tracks.find(t => t.id === audioState.activeTrackId);
    
    if (activeTrack) {
      // Only set src if it changed to avoid reloading
      const currentSrc = audio.src;
      
      if (activeTrack.url !== currentSrc && !currentSrc.endsWith(activeTrack.url)) {
        audio.src = activeTrack.url;
      }
      
      audio.loop = audioState.isLooping;
      audio.volume = audioState.volume * localVolume;

      if (audioState.isPlaying) {
        audio.play().then(() => {
          setAutoplayBlocked(false);
        }).catch(e => {
          console.error("Autoplay failed:", e);
          setAutoplayBlocked(true);
        });
      } else {
        audio.pause();
        setAutoplayBlocked(false);
      }
    } else {
      audio.pause();
      audio.src = '';
    }
  }, [audioState, tracks, localVolume]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName) return;
    
    const result = await uploadTrack(uploadFile, campaignId, uploadName, 'music');
    if (result.success) {
      setIsUploadOpen(false);
      setUploadName('');
      setUploadFile(null);
      refetchTracks();
    }
  };

  const deleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    
    const supabase = createClient();
    await supabase.from('audio_tracks').delete().eq('id', trackId);
    
    // If deleted track was playing, stop it
    if (audioState.activeTrackId === trackId) {
      updateAudioState({
        activeTrackId: null,
        isPlaying: false
      });
    }
    
    refetchTracks();
  };

  const playTrack = (trackId: string) => {
    // If already playing this track, toggle pause
    if (audioState.activeTrackId === trackId) {
      updateAudioState({ isPlaying: !audioState.isPlaying });
    } else {
      // New track
      updateAudioState({
        activeTrackId: trackId,
        isPlaying: true
      });
    }
  };

  const stopAudio = () => {
    updateAudioState({
      isPlaying: false,
      activeTrackId: null // Optional: clear track or just pause? Plan says "Stop" usually means reset.
    });
  };

  return (
    <Card className="w-full h-full flex flex-col border-none shadow-none bg-transparent">
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Player
          </CardTitle>
          
          {isDm && (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Audio Track</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Track Name</Label>
                    <Input 
                      id="name" 
                      value={uploadName} 
                      onChange={e => setUploadName(e.target.value)}
                      placeholder="Epic Battle Music"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file">Audio File</Label>
                    <Input 
                      id="file" 
                      type="file" 
                      accept="audio/*"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={uploading} className="w-full">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Upload Track
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col min-h-0 relative">
        {autoplayBlocked && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <Button 
              onClick={() => {
                audioRef.current?.play().then(() => setAutoplayBlocked(false));
              }}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Click to Enable Audio
            </Button>
          </div>
        )}

        {/* Active Track Control Bar */}
        <div className="p-4 bg-muted/30 border-b space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col overflow-hidden mr-4">
              <span className="font-medium truncate">
                {tracks.find(t => t.id === audioState.activeTrackId)?.name || 'No track selected'}
              </span>
              <span className="text-xs text-muted-foreground">
                {audioState.isPlaying ? 'Playing' : 'Paused'}
              </span>
            </div>
            
            {isDm && (
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={cn(audioState.isLooping && "text-primary bg-primary/10")}
                  onClick={() => updateAudioState({ isLooping: !audioState.isLooping })}
                  title="Toggle Loop"
                >
                  <Repeat className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={stopAudio}
                  disabled={!audioState.activeTrackId}
                  title="Stop"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
                <Button 
                  variant="default" 
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => updateAudioState({ isPlaying: !audioState.isPlaying })}
                  disabled={!audioState.activeTrackId}
                >
                  {audioState.isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current pl-0.5" />
                  )}
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider 
              value={[isDm ? audioState.volume * 100 : localVolume * 100]} 
              max={100} 
              step={1} 
              onValueChange={(vals) => {
                if (isDm) {
                  updateAudioState({ volume: vals[0] / 100 });
                } else {
                  setLocalVolume(vals[0] / 100);
                }
              }}
              className="flex-1"
            />
          </div>
        </div>

        {/* Track List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {tracksLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center text-muted-foreground p-8 text-sm">
                No tracks uploaded yet.
              </div>
            ) : (
              tracks.map(track => (
                <div 
                  key={track.id} 
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group",
                    audioState.activeTrackId === track.id && "bg-muted"
                  )}
                >
                  <div 
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => isDm && playTrack(track.id)}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded flex items-center justify-center bg-background border",
                      audioState.activeTrackId === track.id && audioState.isPlaying && "text-primary border-primary"
                    )}>
                      {audioState.activeTrackId === track.id && audioState.isPlaying ? (
                        <div className="flex gap-0.5 h-3 items-end">
                          <span className="w-0.5 bg-current animate-[music-bar_1s_ease-in-out_infinite]" />
                          <span className="w-0.5 bg-current animate-[music-bar_1.2s_ease-in-out_infinite_0.1s]" />
                          <span className="w-0.5 bg-current animate-[music-bar_0.8s_ease-in-out_infinite_0.2s]" />
                        </div>
                      ) : (
                        <Music className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "text-sm font-medium truncate",
                        audioState.activeTrackId === track.id && "text-primary"
                      )}>
                        {track.name}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {track.type}
                      </span>
                    </div>
                  </div>
                  
                  {isDm && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTrack(track.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* Hidden Audio Element */}
        <audio ref={audioRef} />
      </CardContent>
    </Card>
  );
}
