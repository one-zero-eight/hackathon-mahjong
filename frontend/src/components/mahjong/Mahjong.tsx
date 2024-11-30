import type { DotLottieWorker } from '@lottiefiles/dotlottie-react'
import type { Tile as TileT } from './game'
import { DotLottieWorkerReact } from '@lottiefiles/dotlottie-react'
import { useEffect, useRef, useState } from 'react'
import useSound from 'use-sound'
import soundTilesMergedDelayed from './assets/bloop_300ms.mp3'
import boomLottie from './assets/boom.lottie?arraybuffer'
import soundTileSelect from './assets/pop-down.mp3'
import { FieldTemplate, TEMPLATE_2 } from './field-template'
import { Game } from './game'
import styles from './Mahjong.module.scss'
import { Tile } from './Tile'

const LOTTIE_SIZE = 300

export function Mahjong() {
  const [tiles, setTiles] = useState<TileT[]>([])
  const [selected, setSelected] = useState<TileT | null>(null)
  const [mergedAt, setMergedAt] = useState<{ x: number, y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [playTilesMergedDelayed] = useSound(soundTilesMergedDelayed, { volume: 0.8 })
  const [playTileSelected] = useSound(soundTileSelect, { volume: 0.8 })

  const [lottie, setLottie] = useState<DotLottieWorker | null>(null)

  const [game, _] = useState(() => {
    const g = Game.random(
      FieldTemplate.decode(TEMPLATE_2),
      (a, b) => a === b,
      [
        'alfa-romeo',
        'aston-martin',
        'atom',
        'audi',
        'bentley',
        'bmw',
        'bugatti',
        'byd',
        'chevrolet',
        'ferrari',
        'fiat',
        'ford',
        'honda',
        'hyundai',
        'jeep',
        'kia',
        'lamborghini',
        'land-rover',
        'lexus',
        'lucid-motors',
        'mclaren',
        'mercedes-benz',
        'mini',
        'morgan-motor-company',
        'nio',
        'porsche',
        'rivian',
        'rolls-royce',
        'subaru',
        'tesla',
        'toyota',
        'volkswagen',
        'volvo',
      ],
    )
    g.onTilesChange = (newTitles) => {
      setTiles(newTitles)
    }
    g.onSelectedTileChange = (newSelected) => {
      setSelected(newSelected)
    }
    setTiles(g.tiles())
    return g
  })

  useEffect(() => {
    if (mergedAt) {
      lottie?.setFrame(0)
        .then(() => lottie.resize())
        .then(() => lottie?.unfreeze())
        .then(() => lottie?.play())
    }
    else {
      lottie?.stop()
    }
  }, [mergedAt, lottie])

  const handleUndo = () => {
    game.undoLastMove()
  }

  const handleTileClick = (t: TileT) => {
    const outcome = game.selectTileAt(t.coord)
    switch (outcome) {
      case 'selected':
        playTileSelected()
        break
      case 'merged': {
        playTileSelected()
        playTilesMergedDelayed()

        const lastMove = game.lastMove()
        if (containerRef.current && lottie && lastMove) {
          const [tileA, tileB] = lastMove
          const aEl = containerRef.current.querySelector(`[data-coord="${tileA.coord.x},${tileA.coord.y},${tileA.coord.z}"]`)
          const bEl = containerRef.current.querySelector(`[data-coord="${tileB.coord.x},${tileB.coord.y},${tileB.coord.z}"]`)
          if (aEl && bEl) {
            const aRect = aEl.getBoundingClientRect()
            const middleA = {
              x: aRect.left + aRect.width / 2,
              y: aRect.top + aRect.height / 2,
            }
            const bRect = bEl.getBoundingClientRect()
            const middleB = {
              x: bRect.left + bRect.width / 2,
              y: bRect.top + bRect.height / 2,
            }

            const middle = {
              x: (middleA.x + middleB.x) / 2,
              y: (middleA.y + middleB.y) / 2,
            }

            const aClone = aEl.cloneNode(true) as HTMLDivElement
            aClone.style.position = 'fixed'
            aClone.style.left = `${aRect.left}px`
            aClone.style.top = `${aRect.top}px`
            aClone.style.zIndex = '9999'
            aClone.classList.remove(styles.selected)
            aClone.classList.add(styles.animated)

            const bClone = bEl.cloneNode(true) as HTMLDivElement
            bClone.style.position = 'fixed'
            bClone.style.left = `${bRect.left}px`
            bClone.style.top = `${bRect.top}px`
            bClone.style.zIndex = '9999'
            bClone.classList.remove(styles.selected)
            bClone.classList.add(styles.animated)

            // Animate them to move to a middle point and then disappear.
            const aAnim = aClone.animate(
              [
                { left: `${aRect.left}px`, top: `${aRect.top}px` },
                { left: `${middle.x - aRect.width / 2}px`, top: `${middle.y - aRect.height / 2}px` },
              ],
              {
                duration: 300,
                fill: 'forwards',
              },
            )
            bClone.animate(
              [
                { left: `${bRect.left}px`, top: `${bRect.top}px` },
                { left: `${middle.x - bRect.width / 2}px`, top: `${middle.y - bRect.height / 2}px` },
              ],
              {
                duration: 300,
                fill: 'forwards',
              },
            )

            aAnim.addEventListener('finish', () => {
              aClone.remove()
              bClone.remove()
              setMergedAt(middle)
            })

            document.body.appendChild(aClone)
            document.body.appendChild(bClone)
          }
        }
        break
      }
      case 'none':
      case 'unselected':
        break
    }
  }

  // sort tiles by z, then by x, then by y
  tiles.sort((a, b) => {
    if (a.coord.z !== b.coord.z) {
      return a.coord.z - b.coord.z
    }
    if (a.coord.x !== b.coord.x) {
      return a.coord.x - b.coord.x
    }
    return a.coord.y - b.coord.y
  })

  return (
    <div
      className="relative mt-8"
      ref={containerRef}
    >
      <button
        className="absolute left-4 top-4 rounded bg-red-500 p-2 text-white"
        onClick={handleUndo}
        type="button"
      >
        Undo Move
      </button>
      <div
        className={styles.boom}
        style={mergedAt
          ? {
              left: `${mergedAt.x - LOTTIE_SIZE / 2}px`,
              top: `${mergedAt.y - LOTTIE_SIZE / 2}px`,
            }
          : {
              visibility: 'hidden',
            }}
      >
        <DotLottieWorkerReact
          data={boomLottie}
          autoplay={false}
          renderConfig={{
            freezeOnOffscreen: false,
          }}
          dotLottieRefCallback={setLottie}
        />
      </div>
      {tiles.map((t, i) => (
        <Tile
          key={i}
          brand={t.kind}
          closed={!game.isTileOpen(t.coord)}
          selected={t === selected}
          onClick={() => handleTileClick(t)}
          coord={t.coord}
        />
      ))}
    </div>
  )
}
