// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Import this file to use console.log
import "hardhat/console.sol";
import "./interfaces/IUniswapV2Router02.sol";

contract Assessment is Ownable, ReentrancyGuard{

    using SafeERC20 for IERC20;

    IERC20 USDC;
    IUniswapV2Router02 sushiswapRouter;
    mapping(address => uint256) public deposits;

    event Deposited(address indexed payee, uint256 weiAmount);
    event Withdrawal(address indexed payee, uint amount);
    event Swapped(address indexed form, address indexed to, uint amount);

    constructor(address _USDC, address _sushiswapRouter) Ownable() {
        USDC = IERC20(_USDC);
        sushiswapRouter = IUniswapV2Router02(_sushiswapRouter);
    }

    function deposit(uint _amount) nonReentrant external {
        require(_amount > 0, "The given amount is not valid");
        IERC20(USDC).safeTransferFrom(_msgSender(), address(this), _amount);
        deposits[_msgSender()] += _amount;
        emit Deposited(_msgSender(), _amount);
    }

    function withdraw(uint _amount) nonReentrant external {
        require(_amount > 0, "The given amount is not valid");
        require(deposits[_msgSender()] >= _amount, "The given amount is grater than the user's balance");
        deposits[_msgSender()] -= _amount;
        IERC20(USDC).safeTransfer(_msgSender(), _amount);
        emit Withdrawal(_msgSender(), _amount);
    }

    /**
     * @dev Swap tokens by Sushiswap
     * @param _receiver The address of recipient of amount out
     * @param _amountIn The amount to be swapped
     * @param _from The address of source token
     * @param _to The address of destination token
     * @param _path The used path to accomplish the swap
     * @param _amountOutMin The min expected amount aut 
     * @param deadline The expire time of the transaction
    */
    function swap(
        address _receiver, 
        uint _amountIn, 
        address _from, 
        address _to, 
        address[] calldata _path, 
        uint _amountOutMin, 
        uint deadline
    ) onlyOwner payable external {
        if (isETH(_from)) {
            require(msg.value == _amountIn, "The received coin must be equal with the given amount");
            sushiswapRouter.swapExactETHForTokens{value : msg.value}(_amountOutMin, _path, _receiver, deadline);
        } else {
            IERC20(_from).safeTransferFrom(_msgSender(), address(this), _amountIn);
            IERC20(_from).safeApprove(address(sushiswapRouter), _amountIn);
            if (isETH(_to)) {
                sushiswapRouter.swapExactTokensForETH(_amountIn, _amountOutMin, _path, _receiver, deadline);
            } else {
                sushiswapRouter.swapExactTokensForTokens(_amountIn, _amountOutMin, _path, _receiver, deadline);
            }
        }
        emit Swapped(_from, _to, _amountIn);
    }

    function isETH(address _address) private returns (bool){
        return _address == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) || _address == address(0x0000000000000000000000000000000000001010);
    }
}
