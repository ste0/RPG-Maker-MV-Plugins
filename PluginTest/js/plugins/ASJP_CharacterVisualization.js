//=============================================================================
// ASJP_CharacterVisualization.js
//=============================================================================
// Copyright (c) 2022 jp_asty
// This software is released under the MIT License, see LICENSE.
//=============================================================================

/*:
 * @plugindesc マップの影に隠れたキャラクターをシルエット表示します。
 * @author jp_asty
 *
 * @param silhouetteColor
 * @type string
 * @default rgba(0, 0, 0, 0.5)
 * @desc デフォルト: rgba(0, 0, 0, 0.5)
 赤(0~255)、緑(0~255)、青(0~255)、アルファ(0~1)の順で指定。
 * @text シルエットの色
 *
 * @help
 * マップの影に隠れたキャラクターをシルエット表示します。
 *
 * 利用規約
 * This plugin is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
(function() {

  'use strict';
  const inParams = PluginManager.parameters("ASJP_CharacterVisualization");
  const silhouetteColor = inParams["silhouetteColor"];

  //-----------------------------------------------------------------------------
  // Bitmap
  //
  Bitmap.prototype.drawSilhouette = function(tilemap, tmpBitmap) {
    const tileW = tilemap._tileWidth;
    const tileH = tilemap._tileHeight;
    const xTileNum = Graphics.width / tileW + 1;
    const yTileNum = Graphics.height / tileH + 1;
    const bitmapW = this.width;
    const bitmapH = this.height;
    this._context.save();
    this._context.clearRect(0, 0, bitmapW, bitmapH);
    tmpBitmap._context.clearRect(0, 0, bitmapW, bitmapH);

    for(let i=0; i<yTileNum; i++) {
      for(let j=0; j<xTileNum; j++) {
        const x = Math.floor(j + $gameMap.displayX());
        const y = Math.floor(i + $gameMap.displayY());
        const backSidePassageTiles = $gameMap.backSidePassageTiles(x, y);
        if(backSidePassageTiles.length > 0) {
          for(const tileId of backSidePassageTiles) {
            const setNumber = 5 + Math.floor(tileId / 256);
            const sx = (Math.floor(tileId / 128) % 2 * 8 + tileId % 8) * tileW;
            const sy = (Math.floor(tileId % 256 / 8) % 16) * tileH;
            const sw = tileW;
            const sh = tileH;
            const dx = (x - $gameMap.displayX()) * tileW;
            const dy = (y - $gameMap.displayY()) * tileH;
            const tilesetBitmap = tilemap.bitmaps[setNumber];
            tmpBitmap._context.globalCompositeOperation = 'source-over';
            tmpBitmap._context.drawImage(tilesetBitmap._canvas, sx, sy, sw, sh, dx, dy, sw, sh);
          }
        }
      }
    }
    const characters = tilemap.children.filter(sprite => sprite.constructor.name === "Sprite_Character")
                                       .filter(sprite => sprite._characterName && sprite._tileId === 0)
                                       .filter(sprite => sprite.visible)
                                       .map(sprite => sprite._character)
                                       .filter(character => character.isNearTheScreen());
    for(const character of characters) {
      const characterName = character.characterName();
      const characterBitmap = ImageManager.loadCharacter(characterName);
      const isBig           = ImageManager.isBigCharacter(characterName);
      const characterW = characterBitmap.width / (isBig ? 3 : 12);
      const characterH = characterBitmap.height / (isBig ? 4 : 8);
      const n = character.characterIndex();
      const m = character.pattern();
      const d = character.direction();
      const sx = (n % 4 * 3 + m) * characterW;
      const sy = (Math.floor(n / 4) * 4) * characterH + (d - 2) / 2 * characterH;
      const sw = characterW;
      const sh = characterH;
      const dx = character.screenX() - characterW / 2;
      const dy = character.screenY() - characterH;
      this._context.globalCompositeOperation = 'source-over';
      this._context.drawImage(characterBitmap._canvas, sx, sy, sw, sh, dx, dy, sw, sh);
    }
    this._context.globalCompositeOperation = 'source-in';
    this._context.drawImage(tmpBitmap._canvas, 0, 0, bitmapW, bitmapH, 0, 0, bitmapW, bitmapH);

    this._context.fillStyle = silhouetteColor;
    this._context.fillRect(0, 0, bitmapW, bitmapH);

    this._context.restore();
    this._setDirty();
  };

  //-----------------------------------------------------------------------------
  // Game_Map
  //
  Game_Map.prototype.backSidePassageTiles = function(x, y) {
    const flags = this.tilesetFlags();
    return this.events().filter(event => event._tileId > 0)
                        .filter(event => event.posNt(x, y))
                        .map(event => event.tileId())
                        .concat(this.layeredTiles(x, y))
                        .filter(id => id !== 0 && (flags[id] & 0x10) === 0x10);
  };

  //-----------------------------------------------------------------------------
  // Spriteset_Map
  //
  const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
  Spriteset_Map.prototype.createLowerLayer = function() {
    _Spriteset_Map_createLowerLayer.call(this);
    this.createSilhouette();
  };

  Spriteset_Map.prototype.createSilhouette = function() {
    this._silhouetteSprite = new Sprite();
    const width = Graphics.width + this._tilemap.tileWidth;
    const height = Graphics.height + this._tilemap.tileHeight;
    this._silhouetteSprite.bitmap = new Bitmap(width, height);
    this._silhouetteSprite.z = 8;
    this._tilemap.addChild(this._silhouetteSprite);
    this._tmpBitmap = new Bitmap(width, height);
  };

  const _Spriteset_Map_update = Spriteset_Map.prototype.update;
  Spriteset_Map.prototype.update = function() {
    _Spriteset_Map_update.call(this);
    this.updateSilhouette();
  };

  Spriteset_Map.prototype.updateSilhouette = function() {
    this._silhouetteSprite.bitmap.drawSilhouette(this._tilemap, this._tmpBitmap);
  };

})();
