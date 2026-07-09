// ── Central icon mapping ──────────────────────────────────────────────────
// Replaces raw decorative emoji in UI controls (buttons, badges, panels) with
// consistent lucide-react icons that fit the dark medieval theme. Emoji used
// purely as narrative/atmospheric flavor inside story text is left untouched —
// this file only covers *interactive UI* icon needs.
import {
  Sword, Swords, Shield, ShieldHalf, FlaskConical, Coins, Heart, HeartCrack,
  ScrollText, Backpack, Users, Skull, Gem, Package, Settings, User, Volume2,
  VolumeX, Sun, Moon, Globe, LogOut, Trash2, Check, X, Plus, Minus, ArrowLeft,
  ArrowRight, Star, Crown, Flame, Wand2, Axe, BookOpen, MapPin, Dices,
  MessageCircle, Info, AlertTriangle, ShoppingBag, TrendingUp, Home, Repeat,
  Cross, Target, Diamond, Brain, Zap, Rabbit,
} from 'lucide-react';

// Item/category icons — used in shop, inventory, loot displays
export const ItemIcon = {
  weapon: Sword,
  armor: Shield,
  potion: FlaskConical,
  misc: Package,
  scroll: ScrollText,
  ring: Diamond,
  gold: Coins,
};

// Class icons — used in character creation / sheet
export const ClassIcon = {
  savasci: Sword,
  buyucu: Wand2,
  hirsiz: Dices,
  rahip: Cross,
  avci: Target,
  barbar: Axe,
  // Turkish display-name keys (used directly as object keys in some pages)
  'Savaşçı': Sword,
  'Büyücü': Wand2,
  'Hırsız': Dices,
  'Rahip': Cross,
  'Avcı': Target,
  'Barbar': Axe,
};

// Stat icons — used in character creation / sheet
export const StatIcon = {
  strength: Zap,
  dexterity: Rabbit,
  constitution: Shield,
  intelligence: BookOpen,
  wisdom: Brain,
  charisma: Star,
};

export const UiIcon = {
  hp: Heart,
  hpBroken: HeartCrack,
  quest: ScrollText,
  inventory: Backpack,
  npc: Users,
  enemy: Skull,
  rare: Gem,
  settings: Settings,
  profile: User,
  soundOn: Volume2,
  soundOff: VolumeX,
  lightMode: Sun,
  darkMode: Moon,
  language: Globe,
  logout: LogOut,
  delete: Trash2,
  confirm: Check,
  cancel: X,
  add: Plus,
  remove: Minus,
  back: ArrowLeft,
  forward: ArrowRight,
  favorite: Star,
  levelUp: Crown,
  ambience: Flame,
  book: BookOpen,
  location: MapPin,
  dice: Dices,
  chat: MessageCircle,
  info: Info,
  warning: AlertTriangle,
  shop: ShoppingBag,
  economy: TrendingUp,
  home: Home,
  abandon: Repeat,
};

export function getItemIcon(type) {
  return ItemIcon[type] || Package;
}

export function getClassIcon(charClass) {
  return ClassIcon[charClass] || Sword;
}
