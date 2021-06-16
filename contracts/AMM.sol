//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.3;

import "hardhat/console.sol";
import "./IERC20.sol";
import "./Owned.sol";
import "./SafeMath.sol";


contract AMM is Owned{
  using SafeMath for uint256;
  struct Token {
    address tokenAddress;
    uint256 initialLiq;
    //... more attributes can also be added if needed
  }
  mapping(uint => Token) public tokens;
  uint256 public rateAToB;
  uint256 public rateBToA;
  
  event Exchanged(address _from, address _to, uint256 _fromAmt, uint256 _toAmt);
  event LiquidityAdded(uint256 _tokenA, uint256 _tokenB);
  event LiquidityRemoved(uint256 _tokenA, uint256 _tokenB);

  constructor(address _tokenA, address _tokenB ){
      tokens[1].tokenAddress = _tokenA;
      tokens[2].tokenAddress = _tokenB;
  }

  // allows the token A to be exchanged to token B and vice versa
  // @_amount would specify the number of tokens to be exchanged
  // @_fromTokenNumber the token number which is to be exchanged 
  // @_toTokenNumber the token number to which token will be exchanged to
  // we have set the token numbers here, but token address can also be taken as args
  // assuming both tokens are of same decimals for simplicity

  function Exchange(uint256 _amount, uint _fromTokenNumber, uint _toTokenNumber) external{
      require(_fromTokenNumber == 1 || _fromTokenNumber == 2, "Invalid choice");
      require(_toTokenNumber == 1 || _toTokenNumber == 2, "Invalid choice");
      require(_toTokenNumber != _fromTokenNumber, "Invalid choice");
      uint256 rate = _fromTokenNumber == 1 ? rateAToB : rateBToA;
      uint256 exchangedAmt = (_amount.mul(rate)).div(1e12); // unscale
      require(IERC20(tokens[_toTokenNumber].tokenAddress).balanceOf(address(this)) >= exchangedAmt, "Insufficient liquidity");
      require(IERC20(tokens[_toTokenNumber].tokenAddress).balanceOf(address(this)) > 0, "Insufficient liquidity");
      // acquire the token to be exchanged and add to liquidity
      require(IERC20(tokens[_fromTokenNumber].tokenAddress).transferFrom(msg.sender, address(this), _amount), "Error receiving the token");
      // send the swapped token to the sender
      require(IERC20(tokens[_toTokenNumber].tokenAddress).transfer(msg.sender, exchangedAmt), "Error sending the token");

      emit Exchanged(tokens[_toTokenNumber].tokenAddress, tokens[_fromTokenNumber].tokenAddress, _amount, exchangedAmt);
  }

  // liquidity for pair (A,B) will be added by owner using this function
  function AddLiquidity(uint256 _pairAAmt, uint256 _pairBAmt) external onlyOwner {
      require(tokens[1].initialLiq == 0, "Liquidity shall only be added once by Owner");
      require(tokens[2].initialLiq == 0, "Liquidity shall only be added once by Owner");
      require(_pairAAmt > 0, "Insufficient liquidity provided for token A");
      require(_pairBAmt > 0, "Insufficient liquidity provided for token B");
      require(IERC20(tokens[1].tokenAddress).transferFrom(msg.sender, address(this), _pairAAmt), "Error receiving the token A");
      tokens[1].initialLiq = _pairAAmt;
      require(IERC20(tokens[2].tokenAddress).transferFrom(msg.sender, address(this), _pairBAmt), "Error receiving the token B");
      tokens[2].initialLiq = _pairBAmt;
      console.log("Liquidity added successfully - coming from contract");
      rateAToB = (_pairBAmt.mul(1e12)).div(_pairAAmt);// scaled
      rateBToA = (_pairAAmt.mul(1e12)).div(_pairBAmt);//scaled

      emit LiquidityAdded(_pairAAmt, _pairBAmt);
  }

  // liquidity for pair (A,B) will be withdrawn by owner using this function
  // all available liquidity will be withdrawn
  function RemoveLiquidity() external onlyOwner {
      uint256 tokenABal = IERC20(tokens[1].tokenAddress).balanceOf(address(this));
      uint256 tokenBBal = IERC20(tokens[2].tokenAddress).balanceOf(address(this));
      require(tokenABal > 0, "Insufficient liquidity");
      require(tokenBBal > 0, "Insufficient liquidity");
      // send tokenA back to owner
      require(IERC20(tokens[1].tokenAddress).transfer(msg.sender, tokenABal), "Error sending the token A");
      // send tokenB back to owner
      require(IERC20(tokens[2].tokenAddress).transfer(msg.sender, tokenBBal), "Error sending the token B");
      
      // reset liquidity pair
      rateAToB = 0;
      rateBToA = 0;

      emit LiquidityRemoved(tokenABal, tokenBBal);
  }

  /// Calculations
  // ... pair A = 1000
  // ... pair B = 100
  // ... rate A -> B => 1000 A = 100 B => 1 A = 0.1 B
  // ... rate B -> A => 100 B = 1000 A => 1 B = 10 A  

}
