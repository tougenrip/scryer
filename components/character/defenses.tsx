"use client";

import { Badge } from "@/components/ui/badge";
import { extractDefensesFromTraits } from "@/lib/utils/character";
import { Acid, Bludgeoning, Cold, Fire, Force, Lightning, Necrotic, Piercing, Poison, Psychic, Radiant, Slashing, Thunder } from "dnd-icons/damage";

interface DefensesProps {
  raceTraits?: any;
}

export function Defenses({ raceTraits }: DefensesProps) {
  const defenses = extractDefensesFromTraits(raceTraits);

  const hasAnyDefenses = 
    defenses.damageResistances.length > 0 ||
    defenses.damageImmunities.length > 0 ||
    defenses.damageVulnerabilities.length > 0 ||
    defenses.conditionImmunities.length > 0;

  if (!hasAnyDefenses) {
    return null;
  }

  // Helper function to get damage type icon
  const getDamageIcon = (damageType: string) => {
    const type = damageType.toLowerCase();
    const iconProps = { size: 12, className: "inline-block mr-1" };
    
    switch (type) {
      case 'acid':
        return <Acid {...iconProps} />;
      case 'bludgeoning':
        return <Bludgeoning {...iconProps} />;
      case 'cold':
        return <Cold {...iconProps} />;
      case 'fire':
        return <Fire {...iconProps} />;
      case 'force':
        return <Force {...iconProps} />;
      case 'lightning':
        return <Lightning {...iconProps} />;
      case 'necrotic':
        return <Necrotic {...iconProps} />;
      case 'piercing':
        return <Piercing {...iconProps} />;
      case 'poison':
        return <Poison {...iconProps} />;
      case 'psychic':
        return <Psychic {...iconProps} />;
      case 'radiant':
        return <Radiant {...iconProps} />;
      case 'slashing':
        return <Slashing {...iconProps} />;
      case 'thunder':
        return <Thunder {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2 pt-1 border-t border-border/50">
      <div className="text-[10px] text-muted-foreground mb-1">Defenses</div>
      
      {defenses.damageResistances.length > 0 && (
        <div className="space-y-0.5">
          <div className="text-[10px] text-muted-foreground">Resistances</div>
          <div className="flex flex-wrap gap-1">
            {defenses.damageResistances.map((resistance, index) => (
              <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0 capitalize flex items-center">
                {getDamageIcon(resistance)}
                {resistance}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {defenses.damageImmunities.length > 0 && (
        <div className="space-y-0.5">
          <div className="text-[10px] text-muted-foreground">Immunities</div>
          <div className="flex flex-wrap gap-1">
            {defenses.damageImmunities.map((immunity, index) => (
              <Badge key={index} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize flex items-center">
                {getDamageIcon(immunity)}
                {immunity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {defenses.damageVulnerabilities.length > 0 && (
        <div className="space-y-0.5">
          <div className="text-[10px] text-muted-foreground">Vulnerabilities</div>
          <div className="flex flex-wrap gap-1">
            {defenses.damageVulnerabilities.map((vulnerability, index) => (
              <Badge key={index} variant="destructive" className="text-[10px] px-1.5 py-0 capitalize flex items-center">
                {getDamageIcon(vulnerability)}
                {vulnerability}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {defenses.conditionImmunities.length > 0 && (
        <div className="space-y-0.5">
          <div className="text-[10px] text-muted-foreground">Condition Resistance</div>
          <div className="flex flex-wrap gap-1">
            {defenses.conditionImmunities.map((immunity, index) => (
              <Badge key={index} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                {immunity}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

