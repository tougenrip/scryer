import { CombatStats, CombatAction } from "./combat-stat-block-editor";
import { RichTextDisplay } from "@/components/shared/rich-text-display";
import { cn } from "@/lib/utils";

interface CombatStatBlockDisplayProps {
  stats: CombatStats;
}

export function CombatStatBlockDisplay({ stats }: CombatStatBlockDisplayProps) {
  if (!stats) return null;

  const renderActionList = (title: string, list?: CombatAction[]) => {
    if (!list || list.length === 0) return null;
    return (
      <div className="space-y-3 mt-4">
        <h4 className="text-xl font-serif font-semibold border-b border-orange-700/30 dark:border-orange-500/30 pb-1 text-orange-900 dark:text-orange-400 capitalize">{title}</h4>
        <div className="space-y-3 mt-2 text-foreground/90">
          {list.map((action, idx) => (
            <div key={idx} className="text-[15px] leading-snug">
              {action.name && <span className="font-bold mr-1 italic font-serif text-foreground">{action.name}.</span>}
              <span className="inline">
                <RichTextDisplay content={action.description || ""} />
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div className="relative font-sans text-[15px] leading-relaxed max-w-2xl mx-auto bg-[#FDF1DC] dark:bg-[#1C1814] border-x border-[#E69A28]/30 dark:border-[#E69A28]/20 shadow-md">
      {/* Top Border */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#E69A28] via-[#E69A28] to-[#E69A28] border-y border-[#922610] dark:border-[#E69A28]" />
      
      <div className="p-4 sm:p-6 text-[#58180D] dark:text-[#E2C792]">
        
        {/* Core Stats */}
        <div className="space-y-1 mb-4">
          <div>
            <span className="font-bold text-[#922610] dark:text-[#E69A28]">Armor Class</span> {stats.ac}
          </div>
          <div>
            <span className="font-bold text-[#922610] dark:text-[#E69A28]">Hit Points</span> {stats.hp} {stats.maxHp ? `(${stats.maxHp} max)` : ''}
          </div>
          <div>
            <span className="font-bold text-[#922610] dark:text-[#E69A28]">Speed</span> {stats.speed}
          </div>
        </div>

        {/* Tapered Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#922610] dark:via-[#E69A28] to-transparent my-4 opacity-70" />

        {/* Ability Scores */}
        <div className="grid grid-cols-6 gap-1 text-center py-1">
          {[
            { label: 'STR', val: stats.str },
            { label: 'DEX', val: stats.dex },
            { label: 'CON', val: stats.con },
            { label: 'INT', val: stats.int },
            { label: 'WIS', val: stats.wis },
            { label: 'CHA', val: stats.cha },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span className="font-bold text-sm text-[#922610] dark:text-[#E69A28]">{stat.label}</span>
              <span className="font-semibold text-foreground dark:text-[#E2C792]">
                {stat.val} ({getModifier(stat.val)})
              </span>
            </div>
          ))}
        </div>

        {/* Tapered Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#922610] dark:via-[#E69A28] to-transparent my-4 opacity-70" />

        {/* Secondary Details */}
        <div className="space-y-1 my-4">
          {stats.savingThrows && (
            <div><span className="font-bold text-[#922610] dark:text-[#E69A28]">Saving Throws</span> {stats.savingThrows}</div>
          )}
          {stats.skills && (
            <div><span className="font-bold text-[#922610] dark:text-[#E69A28]">Skills</span> {stats.skills}</div>
          )}
          {stats.senses && (
            <div><span className="font-bold text-[#922610] dark:text-[#E69A28]">Senses</span> {stats.senses}</div>
          )}
          {stats.languages && (
            <div><span className="font-bold text-[#922610] dark:text-[#E69A28]">Languages</span> {stats.languages}</div>
          )}
          {stats.challengeRating && (
            <div><span className="font-bold text-[#922610] dark:text-[#E69A28]">Challenge</span> {stats.challengeRating}</div>
          )}
        </div>

        {/* Tapered Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#922610] dark:via-[#E69A28] to-transparent my-4 opacity-70" />

        {/* Actions & Traits */}
        <div className="space-y-6 mt-6">
          {renderActionList("Traits", stats.traits)}
          {renderActionList("Actions", stats.actions)}
          {renderActionList("Bonus Actions", stats.bonusActions)}
          {renderActionList("Reactions", stats.reactions)}
          {renderActionList("Legendary Actions", stats.legendaryActions)}
        </div>
      </div>

      {/* Bottom Border */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#E69A28] via-[#E69A28] to-[#E69A28] border-y border-[#922610] dark:border-[#E69A28]" />
    </div>
  );
}
