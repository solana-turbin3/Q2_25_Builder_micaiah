## Redeem CN for SOL

In this scenario, the user wants to redeem `n` CN tokens for SOL. If the user owns `n` CN tokens, the protocol will burn `n` CN and `n` PT tokens. The protocol will then calculate the NAV (Net Asset Value) of the protocol and transfer the equivalent amount in SOL to the user.


```mermaid
sequenceDiagram
  participant User
  participant ProtocolProgram
  participant CNMint
  participant PTMint
  participant Treasury
  participant BurnAddress

  User->>ProtocolProgram: Request to redeem n CN

  ProtocolProgram->>CNMint: Assert user owns ≥ n CN
  ProtocolProgram->>PTMint: Assert protocol owns ≥ n PT

  alt Any assertion fails
    ProtocolProgram-->>User: Error (Insufficient CN or PT)
  else All assertions pass
    ProtocolProgram->>CNMint: Burn n CN
    CNMint->>BurnAddress: Transfer n CN

    ProtocolProgram->>PTMint: Burn n PT
    PTMint->>BurnAddress: Transfer n PT

    ProtocolProgram->>ProtocolProgram: Calculate NAV = TV / PTs
    ProtocolProgram->>ProtocolProgram: Calculate payout = n × NAV

    ProtocolProgram->>Treasury: Check balance ≥ payout

    alt Treasury has enough
      Treasury->>User: Transfer payout amount in SOL
    else Insufficient treasury
      ProtocolProgram-->>User: Error (Insufficient funds)
    end
  end
```
