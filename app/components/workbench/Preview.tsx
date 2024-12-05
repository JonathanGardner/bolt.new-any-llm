import { useStore } from '@nanostores/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { workbenchStore } from '~/lib/stores/workbench';
import { PortDropdown } from './PortDropdown';

const devicePresets = [
  { name: 'Responsive', width: '100%', height: '100%' },
  { name: 'iPhone SE', width: '375px', height: '667px' },
  { name: 'iPhone 12', width: '390px', height: '844px' },
  { name: 'iPad', width: '768px', height: '1024px' },
  { name: 'Desktop (1024x768)', width: '1024px', height: '768px' },
];

export const Preview = memo(() => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPortDropdownOpen, setIsPortDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(devicePresets[0]);
  const hasSelectedPreview = useRef(false);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];

  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!activePreview) {
      setUrl('');
      setIframeUrl(undefined);
      return;
    }

    const { baseUrl } = activePreview;
    setUrl(baseUrl);
    setIframeUrl(baseUrl);
  }, [activePreview, iframeUrl]);

  const validateUrl = useCallback(
    (value: string) => {
      if (!activePreview) {
        return false;
      }

      const { baseUrl } = activePreview;

      if (value === baseUrl) {
        return true;
      } else if (value.startsWith(baseUrl)) {
        return ['/', '?', '#'].includes(value.charAt(baseUrl.length));
      }

      return false;
    },
    [activePreview],
  );

  const findMinPortIndex = useCallback(
    (minIndex: number, preview: { port: number }, index: number, array: { port: number }[]) => {
      return preview.port < array[minIndex].port ? index : minIndex;
    },
    [],
  );

  // when previews change, display the lowest port if user hasn't selected a preview
  useEffect(() => {
    if (previews.length > 1 && !hasSelectedPreview.current) {
      const minPortIndex = previews.reduce(findMinPortIndex, 0);
      setActivePreviewIndex(minPortIndex);
    }
  }, [previews, findMinPortIndex]);

  const reloadPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen && containerRef.current) {
      await containerRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col relative">
      {isPortDropdownOpen && (
        <div
          className="z-iframe-overlay w-full h-full absolute"
          onClick={() => setIsPortDropdownOpen(false)}
        />
      )}
      <div className="bg-bolt-elements-background-depth-2 p-2 flex items-center gap-1.5">
        <IconButton icon="i-ph:arrow-clockwise" onClick={reloadPreview} />

        <div
          className="flex items-center gap-1 flex-grow bg-bolt-elements-preview-addressBar-background border border-bolt-elements-borderColor text-bolt-elements-preview-addressBar-text rounded-full px-3 py-1 text-sm hover:bg-bolt-elements-preview-addressBar-backgroundHover hover:focus-within:bg-bolt-elements-preview-addressBar-backgroundActive focus-within:bg-bolt-elements-preview-addressBar-backgroundActive
        focus-within-border-bolt-elements-borderColorActive focus-within:text-bolt-elements-preview-addressBar-textActive"
        >
          <input
            ref={inputRef}
            className="w-full bg-transparent outline-none"
            type="text"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && validateUrl(url)) {
                setIframeUrl(url);

                if (inputRef.current) {
                  inputRef.current.blur();
                }
              }
            }}
          />
        </div>
        
        {previews.length > 1 && (
          <PortDropdown
            activePreviewIndex={activePreviewIndex}
            setActivePreviewIndex={setActivePreviewIndex}
            isDropdownOpen={isPortDropdownOpen}
            setHasSelectedPreview={(value) => (hasSelectedPreview.current = value)}
            setIsDropdownOpen={setIsPortDropdownOpen}
            previews={previews}
          />
        )}

        {/* Device dropdown */}
        <div className="relative">
          <button
            className="flex items-center px-3 py-1 bg-bolt-elements-preview-addressBar-background border border-bolt-elements-borderColor rounded-full text-sm hover:bg-bolt-elements-preview-addressBar-backgroundHover"
            onClick={() => {
              // We'll toggle a simple device dropdown
              // In a real scenario, you might create a proper dropdown component
              const newIndex = (devicePresets.findIndex(d => d === selectedDevice) + 1) % devicePresets.length;
              setSelectedDevice(devicePresets[newIndex]);
            }}
            title="Change Device Size"
          >
            {selectedDevice.name}
          </button>
        </div>

        {/* Fullscreen toggle button */}
        <IconButton
          icon={isFullscreen ? "i-ph:arrows-in" : "i-ph:arrows-out"}
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
        />
      </div>

      {/* Device wrapper with custom size */}
      <div 
        className="flex-1 border-t border-bolt-elements-borderColor flex justify-center items-center overflow-auto"
        style={{
          // If Responsive is selected, just 100%, else fixed size
          width: selectedDevice.name === 'Responsive' ? '100%' : 'auto',
          height: selectedDevice.name === 'Responsive' ? '100%' : 'auto',
        }}
      >
        <div
          style={{
            width: selectedDevice.width,
            height: selectedDevice.height,
            border: selectedDevice.name === 'Responsive' ? 'none' : '1px solid #ccc',
            boxShadow: selectedDevice.name === 'Responsive' ? 'none' : '0 0 10px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            background: '#fff',
            position: 'relative',
          }}
        >
          {activePreview ? (
            <iframe
              ref={iframeRef}
              className="border-none w-full h-full bg-white"
              src={iframeUrl}
              allowFullScreen
            />
          ) : (
            <div className="flex w-full h-full justify-center items-center bg-white">
              No preview available
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
