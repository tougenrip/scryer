// app/test-db/page.tsx
import { createClient } from '@/lib/supabase/server'
import { Strength, Wizard } from 'dnd-icons';

export default async function TestPage() {
  const supabase = await createClient()
  
  // Test SRD data
  const { data: spells, error } = await supabase
    .from('srd_spells')
    .select('name')
    .limit(5)
  
  if (error) {
    return <div>Error: {error.message}</div>
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      <p>Successfully connected to Supabase!</p>
      <h2 className="text-xl mt-4 mb-2">Sample Spells:</h2>
      <ul>
        {spells?.map((spell, i) => (
          <li key={i}>{spell.name}</li>
        ))}
      </ul>
      <Strength size={48} />
      <Wizard size={48} />
    </div>
  )
}