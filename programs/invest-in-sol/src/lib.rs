use anchor_lang::prelude::*;

declare_id!("7HLJsmGgZ37JAqmihGYNqmcuxG1qvt4s9t3EWJyaaPVo");

#[program]
pub mod invest_in_sol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
