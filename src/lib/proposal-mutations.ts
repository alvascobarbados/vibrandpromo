/**
 * Staff-side proposal writes. All of them go through the browser client, so the
 * staff-only RLS policies remain the boundary. Any structural change to an
 * already-generated proposal flags it as edited since generation.
 */
import { supabase } from "@/integrations/supabase/client";

export async function markEditedIfGenerated(proposalId: string, status: string) {
  if (status !== "generated") return;
  const { error } = await supabase
    .from("proposals")
    .update({ edited_since_generated: true })
    .eq("id", proposalId);
  if (error) throw new Error(error.message);
}

export async function addProposalItem(
  proposalId: string,
  productId: string,
  status: string,
  nextPosition: number,
) {
  const { error } = await supabase
    .from("proposal_items")
    .insert({ proposal_id: proposalId, product_id: productId, position: nextPosition });
  if (error) throw new Error(error.message);
  await markEditedIfGenerated(proposalId, status);
}

export async function removeProposalItem(proposalId: string, itemId: string, status: string) {
  const { error } = await supabase.from("proposal_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  await markEditedIfGenerated(proposalId, status);
}

export async function saveProposalOrder(proposalId: string, ids: string[], status: string) {
  for (const [index, id] of ids.entries()) {
    const { error } = await supabase
      .from("proposal_items")
      .update({ position: index })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
  await markEditedIfGenerated(proposalId, status);
}