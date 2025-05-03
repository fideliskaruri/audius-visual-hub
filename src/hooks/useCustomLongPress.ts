import { useRef, useCallback } from 'react';

interface LongPressOptions {
    threshold?: number; // ms
    onLongPressStart?: (event: PointerEvent) => void;
    onLongPressEnd?: (event: PointerEvent) => void;
    onCancel?: (event: PointerEvent) => void;
    moveThreshold?: number; // pixels
}

export function useCustomLongPress({
    threshold = 500,
    onLongPressStart,
    onLongPressEnd,
    onCancel,
    moveThreshold = 10,
}: LongPressOptions = {}) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressActive = useRef(false);
    const startCoords = useRef<{ x: number; y: number } | null>(null);

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handlePointerDown = useCallback((event: React.PointerEvent) => {
        // Ensure we handle only primary button (e.g., left mouse, single touch)
        if (event.button !== 0 && event.pointerType !== 'touch') return;

        clearTimer(); // Clear any previous timer
        isLongPressActive.current = false;
        startCoords.current = { x: event.clientX, y: event.clientY };

        // Need to persist the event for the timeout callback
        const persistentEvent = event.nativeEvent as PointerEvent;

        timerRef.current = setTimeout(() => {
            // Check if pointer is still down (implicitly true if timer fires before pointer up)
            // and movement hasn't exceeded threshold
            if (startCoords.current) { // Check if pointer hasn't moved significantly
                isLongPressActive.current = true;
                console.log("Custom Long Press Started");
                onLongPressStart?.(persistentEvent);
            }
            timerRef.current = null;
        }, threshold);

    }, [threshold, onLongPressStart]);

    const handlePointerUp = useCallback((event: React.PointerEvent) => {
        clearTimer();
        if (isLongPressActive.current) {
            console.log("Custom Long Press Ended");
            onLongPressEnd?.(event.nativeEvent as PointerEvent);
            isLongPressActive.current = false;
        }
        startCoords.current = null; // Reset coords
    }, [onLongPressEnd]);

    const handlePointerMove = useCallback((event: React.PointerEvent) => {
        if (!timerRef.current && !isLongPressActive.current) return; // Only check if a press is potentially active

        if (startCoords.current) {
            const dx = Math.abs(event.clientX - startCoords.current.x);
            const dy = Math.abs(event.clientY - startCoords.current.y);

            if (dx > moveThreshold || dy > moveThreshold) {
                // Movement exceeded threshold, cancel potential long press
                clearTimer();
                if (!isLongPressActive.current) { // Only call onCancel if long press didn't already start
                    console.log("Custom Long Press Cancelled (Movement)");
                    onCancel?.(event.nativeEvent as PointerEvent);
                }
                startCoords.current = null; // Stop tracking movement
            }
        }
    }, [moveThreshold, onCancel]);

    const handlePointerLeave = useCallback((event: React.PointerEvent) => {
        // Also cancel if pointer leaves the element
        clearTimer();
        if (!isLongPressActive.current && startCoords.current) { // Only cancel if not already active and press started
            console.log("Custom Long Press Cancelled (Pointer Leave)");
            onCancel?.(event.nativeEvent as PointerEvent);
        }
        // Don't reset isLongPressActive here, pointerUp handles the end
        startCoords.current = null;
    }, [onCancel]);


    // Return props to spread onto the target element
    return {
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerUp,
        onPointerMove: handlePointerMove,
        onPointerLeave: handlePointerLeave, // Handle leaving the element
        // Add context menu prevention if needed, especially for right-click simulation on touch hold
        // onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    };
}