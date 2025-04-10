pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use solana_client::nonblocking::rpc_client::RpcClient;
    use solana_sdk::{
        self,
        message::Message,
        native_token::LAMPORTS_PER_SOL,
        pubkey::Pubkey,
        signature::{Keypair, read_keypair_file},
        signer::Signer,
        system_instruction::transfer,
        transaction::Transaction,
    };
    const RPC_URL: &str = "https://api.devnet.solana.com";
    #[test]
    fn keygen() {
        let kp = Keypair::new();
        println!("You've generated a new Solana wallet: {}", kp.pubkey());
        println!(
            "To save your wallet, copy and paste the following into a JSON file:\n{:?}",
            kp.to_bytes()
        );
    }
    #[tokio::test]
    async fn airdop() {
        let keypair = read_keypair_file("./dev-wallet.json").unwrap();
        let rpc_client = RpcClient::new(RPC_URL.to_string());
        let s = rpc_client
            .request_airdrop(&keypair.pubkey(), 2 * LAMPORTS_PER_SOL)
            .await
            .unwrap();
        println!(
            "https://explorer.solana.com/tx/{}?cluster=devnet",
            s.to_string()
        );
    }
    #[tokio::test]
    async fn transfer_sol() {
        let keypair = read_keypair_file("./dev-wallet.json").unwrap();
        let to_pubkey = Pubkey::from_str("zbBjhHwuqyKMmz8ber5oUtJJ3ZV4B6ePmANfGyKzVGV").unwrap();
        let rpc_client = RpcClient::new(RPC_URL.to_string());
        let balance = rpc_client.get_balance(&keypair.pubkey()).await.unwrap();
        let recent_blockhash = rpc_client.get_latest_blockhash().await.unwrap();
        let tx = Transaction::new_signed_with_payer(
            &[transfer(&keypair.pubkey(), &to_pubkey, balance)],
            Some(&keypair.pubkey()),
            &[&keypair],
            recent_blockhash,
        );
        let fee = rpc_client.get_fee_for_message(&tx.message).await.unwrap();
        let tx = Transaction::new_signed_with_payer(
            &[transfer(&keypair.pubkey(), &to_pubkey, balance - fee)],
            Some(&keypair.pubkey()),
            &[&keypair],
            recent_blockhash,
        );
        let s = rpc_client.send_and_confirm_transaction(&tx).await.unwrap();
        println!(
            "https://explorer.solana.com/tx/{}?cluster=devnet",
            s.to_string()
        );
    }

    #[tokio::test]
    async fn enroll() {}
}
