import { ProposalStatus } from "./types"
import { listPromotions } from "./proposal"

export namespace Promotion {
  export async function list(status?: ProposalStatus[]) {
    return listPromotions(status)
  }
}
